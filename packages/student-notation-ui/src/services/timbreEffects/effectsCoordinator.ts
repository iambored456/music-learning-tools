import type { TimbreState } from '@mlt/types';
import store from '@state/initStore.ts';
import { getSynthEngine } from '@services/runtimeGlobals.ts';
import logger from '@utils/logger.ts';

logger.moduleLoaded('EffectsCoordinator');

type EffectType = 'vibrato' | 'tremolo' | 'delay';
type EffectParameterValues = Record<string, number>;
type EffectParameterMap = Record<EffectType, EffectParameterValues>;
type StoredDialData = Record<string, {
  vibrato?: EffectParameterValues;
  tremelo?: EffectParameterValues;
  delay?: EffectParameterValues;
}>;

interface TimbreCreatedEvent {
  color?: string;
}

interface SynthEngineLike {
  updateSynthForColor?: (color: string) => void;
}

const EFFECT_STATE_DEBOUNCE_MS = 250;

function isEffectType(value: string): value is EffectType {
  return value === 'vibrato' || value === 'tremolo' || value === 'delay';
}

function cloneEffectParameters(map: EffectParameterMap): EffectParameterMap {
  return {
    vibrato: { ...map.vibrato },
    tremolo: { ...map.tremolo },
    delay: { ...map.delay }
  };
}

class EffectsCoordinator {
  private readonly effectParameters = new Map<string, EffectParameterMap>();
  private saveTimerId: ReturnType<typeof setTimeout> | null = null;
  private historyTimerId: ReturnType<typeof setTimeout> | null = null;
  private hasPendingHistoryRecord = false;
  private isRestoringSavedValues = false;

  private readonly defaultEffects: EffectParameterMap = {
    vibrato: { speed: 0, span: 0, wet: 100 },
    tremolo: { speed: 0, span: 0, wet: 100 },
    delay: { time: 0, feedback: 0, wet: 20 }
  };

  init(): boolean {
    Object.keys(store.state.timbres).forEach(color => {
      this.initializeColorEffects(color);
    });

    store.on<TimbreCreatedEvent>('timbreCreated', (payload) => {
      if (!payload?.color) {
        return;
      }
      this.initializeColorEffects(payload.color);
    });

    this.loadSavedValues();

    store.on('effectDialInteractionEnd', () => {
      this.flushScheduledHistoryRecord();
      this.flushScheduledSave();
    });

    logger.info('EffectsCoordinator', 'Event subscriptions established', null, 'effects');
    return true;
  }

  initializeColorEffects(color: string): void {
    if (this.effectParameters.has(color)) {
      return;
    }

    const colorEffects = cloneEffectParameters(this.defaultEffects);
    const timbre = store.state.timbres[color];

    if (timbre?.vibrato) {
      colorEffects.vibrato = { ...colorEffects.vibrato, ...timbre.vibrato };
    }
    if (timbre?.tremelo) {
      colorEffects.tremolo = { ...colorEffects.tremolo, ...timbre.tremelo };
    }

    this.effectParameters.set(color, colorEffects);
    logger.debug('EffectsCoordinator', `Initialized effects for color ${color}`, colorEffects, 'effects');
  }

  updateParameter(effectType: string, parameter: string, value: number, color: string): void {
    this.updateParameters(effectType, { [parameter]: value }, color);
  }

  updateParameters(effectType: string, params: Record<string, number>, color: string): void {
    if (!color) {
      logger.warn(
        'EffectsCoordinator',
        'Cannot update parameters: no color provided',
        { effectType, params },
        'effects'
      );
      return;
    }
    if (!isEffectType(effectType)) {
      logger.warn('EffectsCoordinator', 'Cannot update unknown effect type', { effectType, params, color }, 'effects');
      return;
    }

    this.initializeColorEffects(color);

    const colorEffects = this.effectParameters.get(color);
    if (!colorEffects) {
      return;
    }

    if (!colorEffects[effectType]) {
      colorEffects[effectType] = { ...this.defaultEffects[effectType] };
    }

    const changedEntries = Object.entries(params).filter((entry): entry is [string, number] => {
      const value = entry[1];
      return typeof value === 'number' && Number.isFinite(value);
    });
    if (changedEntries.length === 0) {
      return;
    }

    changedEntries.forEach(([parameter, value]) => {
      colorEffects[effectType][parameter] = value;
    });

    this.updateTimbreState(effectType, colorEffects[effectType], color);

    const [firstParameter, firstValue] = changedEntries[0] ?? ['batch', 0];
    const parameter = changedEntries.length === 1 ? firstParameter : 'batch';
    const value = changedEntries.length === 1 ? firstValue : 0;

    this.notifyAudioSystem(effectType, parameter, value, color, colorEffects[effectType]);
    this.notifyAnimationSystem(effectType, parameter, value, color, colorEffects[effectType]);
    if (!this.isRestoringSavedValues) {
      this.scheduleSaveValues();
    }
  }

  notifyAudioSystem(
    effectType: EffectType,
    parameter: string,
    value: number,
    color: string,
    fullEffectParams: EffectParameterValues
  ): void {
    store.emit('audioEffectChanged', {
      effectType,
      parameter,
      value,
      color,
      effectParams: { ...fullEffectParams }
    });

    logger.debug(
      'EffectsCoordinator',
      `Notified audio system: ${effectType}.${parameter} = ${value} for ${color}`,
      null,
      'effects'
    );
  }

  notifyAnimationSystem(
    effectType: EffectType,
    parameter: string,
    value: number,
    color: string,
    fullEffectParams: EffectParameterValues
  ): void {
    if (effectType !== 'vibrato' && effectType !== 'tremolo') {
      return;
    }

    store.emit('visualEffectChanged', {
      effectType,
      parameter,
      value,
      color,
      effectParams: { ...fullEffectParams }
    });

    logger.debug(
      'EffectsCoordinator',
      `Notified animation system: ${effectType}.${parameter} = ${value} for ${color}`,
      null,
      'effects'
    );
  }

  updateTimbreState(effectType: EffectType, effectParams: EffectParameterValues, color: string): void {
    if (effectType === 'delay') {
      return;
    }

    const timbre = store.state.timbres[color] as TimbreState | undefined;
    if (!timbre) {
      return;
    }

    const timbreProperty = effectType === 'vibrato' ? 'vibrato' : 'tremelo';
    const target = (timbre as TimbreState & {
      vibrato?: EffectParameterValues;
      tremelo?: EffectParameterValues;
    })[timbreProperty] ?? {};

    Object.assign(target, effectParams);
    (timbre as TimbreState & {
      vibrato?: EffectParameterValues;
      tremelo?: EffectParameterValues;
    })[timbreProperty] = target;

    if (!this.isRestoringSavedValues) {
      this.scheduleHistoryRecord();
    }
  }

  getEffectParameters(color: string, effectType: string): EffectParameterValues {
    if (!isEffectType(effectType)) {
      return {};
    }
    const colorEffects = this.effectParameters.get(color);
    if (!colorEffects?.[effectType]) {
      return { ...this.defaultEffects[effectType] };
    }
    return { ...colorEffects[effectType] };
  }

  getAllEffectParameters(color: string): EffectParameterMap {
    const colorEffects = this.effectParameters.get(color);
    if (!colorEffects) {
      return cloneEffectParameters(this.defaultEffects);
    }
    return cloneEffectParameters(colorEffects);
  }

  resetColorEffects(color: string): void {
    const colorEffects = cloneEffectParameters(this.defaultEffects);
    this.effectParameters.set(color, colorEffects);

    Object.entries(colorEffects).forEach(([effectType, params]) => {
      Object.entries(params).forEach(([parameter, value]) => {
        this.notifyAudioSystem(effectType as EffectType, parameter, value, color, params);
        this.notifyAnimationSystem(effectType as EffectType, parameter, value, color, params);
      });
    });

    logger.info('EffectsCoordinator', `Reset all effects for color ${color}`, colorEffects, 'effects');
  }

  private scheduleHistoryRecord(): void {
    this.hasPendingHistoryRecord = true;
    if (this.historyTimerId !== null) {
      clearTimeout(this.historyTimerId);
    }
    this.historyTimerId = setTimeout(() => this.flushScheduledHistoryRecord(), EFFECT_STATE_DEBOUNCE_MS);
  }

  private flushScheduledHistoryRecord(): void {
    if (this.historyTimerId !== null) {
      clearTimeout(this.historyTimerId);
      this.historyTimerId = null;
    }
    if (!this.hasPendingHistoryRecord) {
      return;
    }
    this.hasPendingHistoryRecord = false;
    store.recordState();
  }

  private scheduleSaveValues(): void {
    if (this.saveTimerId !== null) {
      clearTimeout(this.saveTimerId);
    }
    this.saveTimerId = setTimeout(() => this.flushScheduledSave(), EFFECT_STATE_DEBOUNCE_MS);
  }

  private flushScheduledSave(): void {
    if (this.saveTimerId !== null) {
      clearTimeout(this.saveTimerId);
      this.saveTimerId = null;
    }
    this.saveValues();
  }

  saveValues(): void {
    const dialData: StoredDialData = {};

    Object.keys(store.state.timbres).forEach(color => {
      const colorEffects = this.effectParameters.get(color);
      if (!colorEffects) {
        return;
      }

      dialData[color] = {
        vibrato: colorEffects.vibrato || { speed: 0, span: 0, wet: 100 },
        tremelo: colorEffects.tremolo || { speed: 0, span: 0, wet: 100 },
        delay: colorEffects.delay || { time: 0, feedback: 0, wet: 20 }
      };
    });

    try {
      localStorage.setItem('effectDialValues', JSON.stringify(dialData));
      logger.debug('EffectsCoordinator', 'Saved effect values to localStorage', null, 'effects');
    } catch (error) {
      logger.warn('EffectsCoordinator', 'Failed to save effect values to localStorage', error, 'effects');
    }
  }

  loadSavedValues(): void {
    try {
      const saved = localStorage.getItem('effectDialValues');
      if (!saved) {
        logger.debug('EffectsCoordinator', 'No saved effect values found', null, 'effects');
        return;
      }

      const dialData = JSON.parse(saved) as StoredDialData;
      logger.debug('EffectsCoordinator', 'Loading saved effect values', null, 'effects');

      this.isRestoringSavedValues = true;
      Object.entries(dialData).forEach(([color, savedData]) => {
        if (!store.state.timbres[color] || !savedData) {
          return;
        }

        if (savedData.vibrato) {
          Object.entries(savedData.vibrato).forEach(([param, value]) => {
            if (typeof value === 'number') {
              this.updateParameter('vibrato', param, value, color);
            }
          });
        }

        if (savedData.tremelo) {
          Object.entries(savedData.tremelo).forEach(([param, value]) => {
            if (typeof value === 'number') {
              this.updateParameter('tremolo', param, value, color);
            }
          });
        }

        if (savedData.delay) {
          Object.entries(savedData.delay).forEach(([param, value]) => {
            if (typeof value === 'number') {
              this.updateParameter('delay', param, value, color);
            }
          });
        }
      });

      logger.info('EffectsCoordinator', 'Applied saved effect values', null, 'effects');

      const synthEngine = getSynthEngine() as SynthEngineLike | undefined;
      if (!synthEngine?.updateSynthForColor) {
        return;
      }

      Object.entries(dialData).forEach(([color, savedData]) => {
        if (!savedData.delay) {
          return;
        }
        if ((savedData.delay.time ?? 0) > 0 || (savedData.delay.feedback ?? 0) > 0) {
          synthEngine.updateSynthForColor?.(color);
          logger.debug('EffectsCoordinator', `Re-applied effects to synth for ${color}`, null, 'effects');
        }
      });
    } catch (error) {
      logger.warn('EffectsCoordinator', 'Failed to load saved effect values', error, 'effects');
    } finally {
      this.isRestoringSavedValues = false;
    }
  }

  dispose(): void {
    this.flushScheduledHistoryRecord();
    this.flushScheduledSave();
    this.effectParameters.clear();
    logger.info('EffectsCoordinator', 'Disposed', null, 'effects');
  }
}

const effectsCoordinator = new EffectsCoordinator();
export default effectsCoordinator;

/**
 * Auto-generated local drum sample catalog.
 * Generated from packages/audio-samples/assets/drum-sample-bank (wav files).
 */

export type LocalDrumLayer = 'H' | 'M' | 'L';

export type DrumVoiceCategory =
  | 'kick'
  | 'snare'
  | 'hihat'
  | 'clap'
  | 'conga'
  | 'cowbell'
  | 'maracas'
  | 'vocal'
  | 'sfx';

export type DrumVoiceMetadata = {
  category: DrumVoiceCategory;
  description: string;
  source: 'user-curated';
};

export type LocalDrumSampleEntry = {
  id: string;
  machineId: string;
  machineLabel: string;
  fileName: string;
  label: string;
  suggestedLayer: LocalDrumLayer;
  url: string;
  voiceMetadata?: DrumVoiceMetadata;
};

export const LOCAL_DRUM_SAMPLE_ENTRIES: LocalDrumSampleEntry[] = [
  {
    id: '110-series-110chh',
    machineId: '110-series',
    machineLabel: '110 Series',
    fileName: '110CHH.WAV',
    label: '110CHH',
    suggestedLayer: 'H',
    url: new URL('../assets/drum-sample-bank/110-series/110CHH.WAV', import.meta.url).href
  },
  {
    id: '110-series-110clp',
    machineId: '110-series',
    machineLabel: '110 Series',
    fileName: '110CLP.WAV',
    label: '110CLP',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/110-series/110CLP.WAV', import.meta.url).href
  },
  {
    id: '110-series-110kik',
    machineId: '110-series',
    machineLabel: '110 Series',
    fileName: '110KIK.WAV',
    label: '110KIK',
    suggestedLayer: 'L',
    url: new URL('../assets/drum-sample-bank/110-series/110KIK.WAV', import.meta.url).href
  },
  {
    id: '110-series-110snr',
    machineId: '110-series',
    machineLabel: '110 Series',
    fileName: '110SNR.WAV',
    label: '110SNR',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/110-series/110SNR.WAV', import.meta.url).href
  },
  {
    id: 'acetone-rhythm-ace-acetone-rhythm-ace-hhcl',
    machineId: 'acetone-rhythm-ace',
    machineLabel: 'Acetone Rhythm Ace',
    fileName: 'Acetone_Rhythm-Ace HHCL.WAV',
    label: 'Acetone Rhythm-Ace HHCL',
    suggestedLayer: 'H',
    url: new URL('../assets/drum-sample-bank/acetone-rhythm-ace/Acetone_Rhythm-Ace HHCL.WAV', import.meta.url).href
  },
  {
    id: 'acetone-rhythm-ace-acetone-rhythm-ace-kick3',
    machineId: 'acetone-rhythm-ace',
    machineLabel: 'Acetone Rhythm Ace',
    fileName: 'Acetone_Rhythm-Ace KICK3.WAV',
    label: 'Acetone Rhythm-Ace KICK3',
    suggestedLayer: 'L',
    url: new URL('../assets/drum-sample-bank/acetone-rhythm-ace/Acetone_Rhythm-Ace KICK3.WAV', import.meta.url).href
  },
  {
    id: 'acetone-rhythm-ace-acetone-rhythm-ace-perc7',
    machineId: 'acetone-rhythm-ace',
    machineLabel: 'Acetone Rhythm Ace',
    fileName: 'Acetone_Rhythm-Ace PERC7.WAV',
    label: 'Acetone Rhythm-Ace PERC7',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/acetone-rhythm-ace/Acetone_Rhythm-Ace PERC7.WAV', import.meta.url).href
  },
  {
    id: 'acetone-rhythm-ace-acetone-rhythm-ace-snare1',
    machineId: 'acetone-rhythm-ace',
    machineLabel: 'Acetone Rhythm Ace',
    fileName: 'Acetone_Rhythm-Ace SNARE1.WAV',
    label: 'Acetone Rhythm-Ace SNARE1',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/acetone-rhythm-ace/Acetone_Rhythm-Ace SNARE1.WAV', import.meta.url).href
  },
  {
    id: 'acetone-rhythm-master-acetone-rhythm-master-kick',
    machineId: 'acetone-rhythm-master',
    machineLabel: 'Acetone Rhythm Master',
    fileName: 'Acetone_Rhythm-Master Kick.wav',
    label: 'Acetone Rhythm-Master Kick',
    suggestedLayer: 'L',
    url: new URL('../assets/drum-sample-bank/acetone-rhythm-master/Acetone_Rhythm-Master Kick.wav', import.meta.url).href
  },
  {
    id: 'alesis-hr16a-alesis-hr16a-08',
    machineId: 'alesis-hr16a',
    machineLabel: 'Alesis HR-16A',
    fileName: 'Alesis_HR16A_08.wav',
    label: 'Alesis HR16A 08',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/alesis-hr16a/Alesis_HR16A_08.wav', import.meta.url).href
  },
  {
    id: 'alesis-hr16a-alesis-hr16a-09',
    machineId: 'alesis-hr16a',
    machineLabel: 'Alesis HR-16A',
    fileName: 'Alesis_HR16A_09.wav',
    label: 'Alesis HR16A 09',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/alesis-hr16a/Alesis_HR16A_09.wav', import.meta.url).href
  },
  {
    id: 'alesis-hr16a-alesis-hr16a-10',
    machineId: 'alesis-hr16a',
    machineLabel: 'Alesis HR-16A',
    fileName: 'Alesis_HR16A_10.wav',
    label: 'Alesis HR16A 10',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/alesis-hr16a/Alesis_HR16A_10.wav', import.meta.url).href
  },
  {
    id: 'alesis-hr16a-alesis-hr16a-14',
    machineId: 'alesis-hr16a',
    machineLabel: 'Alesis HR-16A',
    fileName: 'Alesis_HR16A_14.wav',
    label: 'Alesis HR16A 14',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/alesis-hr16a/Alesis_HR16A_14.wav', import.meta.url).href
  },
  {
    id: 'alesis-hr16a-alesis-hr16a-16',
    machineId: 'alesis-hr16a',
    machineLabel: 'Alesis HR-16A',
    fileName: 'Alesis_HR16A_16.wav',
    label: 'Alesis HR16A 16',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/alesis-hr16a/Alesis_HR16A_16.wav', import.meta.url).href
  },
  {
    id: 'alesis-hr16a-alesis-hr16a-17',
    machineId: 'alesis-hr16a',
    machineLabel: 'Alesis HR-16A',
    fileName: 'Alesis_HR16A_17.wav',
    label: 'Alesis HR16A 17',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/alesis-hr16a/Alesis_HR16A_17.wav', import.meta.url).href
  },
  {
    id: 'alesis-hr16a-alesis-hr16a-18',
    machineId: 'alesis-hr16a',
    machineLabel: 'Alesis HR-16A',
    fileName: 'Alesis_HR16A_18.wav',
    label: 'Alesis HR16A 18',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/alesis-hr16a/Alesis_HR16A_18.wav', import.meta.url).href
  },
  {
    id: 'alesis-hr16a-alesis-hr16a-19',
    machineId: 'alesis-hr16a',
    machineLabel: 'Alesis HR-16A',
    fileName: 'Alesis_HR16A_19.wav',
    label: 'Alesis HR16A 19',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/alesis-hr16a/Alesis_HR16A_19.wav', import.meta.url).href
  },
  {
    id: 'alesis-hr16a-alesis-hr16a-20',
    machineId: 'alesis-hr16a',
    machineLabel: 'Alesis HR-16A',
    fileName: 'Alesis_HR16A_20.wav',
    label: 'Alesis HR16A 20',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/alesis-hr16a/Alesis_HR16A_20.wav', import.meta.url).href
  },
  {
    id: 'alesis-hr16a-alesis-hr16a-39',
    machineId: 'alesis-hr16a',
    machineLabel: 'Alesis HR-16A',
    fileName: 'Alesis_HR16A_39.wav',
    label: 'Alesis HR16A 39',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/alesis-hr16a/Alesis_HR16A_39.wav', import.meta.url).href
  },
  {
    id: 'alesis-hr16a-alesis-hr16a-43',
    machineId: 'alesis-hr16a',
    machineLabel: 'Alesis HR-16A',
    fileName: 'Alesis_HR16A_43.wav',
    label: 'Alesis HR16A 43',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/alesis-hr16a/Alesis_HR16A_43.wav', import.meta.url).href
  },
  {
    id: 'alesis-hr16a-alesis-hr16a-44',
    machineId: 'alesis-hr16a',
    machineLabel: 'Alesis HR-16A',
    fileName: 'Alesis_HR16A_44.wav',
    label: 'Alesis HR16A 44',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/alesis-hr16a/Alesis_HR16A_44.wav', import.meta.url).href
  },
  {
    id: 'boss-dr-220-dr220tom-hi',
    machineId: 'boss-dr-220',
    machineLabel: 'Boss DR-220',
    fileName: 'DR220Tom_Hi.wav',
    label: 'DR220Tom Hi',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/boss-dr-220/DR220Tom_Hi.wav', import.meta.url).href
  },
  {
    id: 'boss-dr-220-dr220tom-lo',
    machineId: 'boss-dr-220',
    machineLabel: 'Boss DR-220',
    fileName: 'DR220Tom_Lo.wav',
    label: 'DR220Tom Lo',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/boss-dr-220/DR220Tom_Lo.wav', import.meta.url).href
  },
  {
    id: 'boss-dr-220-dr220tom-mid',
    machineId: 'boss-dr-220',
    machineLabel: 'Boss DR-220',
    fileName: 'DR220Tom_Mid.wav',
    label: 'DR220Tom Mid',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/boss-dr-220/DR220Tom_Mid.wav', import.meta.url).href
  },
  {
    id: 'cr-80-cr80-ahh',
    machineId: 'cr-80',
    machineLabel: 'CR-80',
    fileName: 'CR80_Ahh.wav',
    label: 'CR80 Ahh',
    suggestedLayer: 'H',
    url: new URL('../assets/drum-sample-bank/cr-80/CR80_Ahh.wav', import.meta.url).href
  },
  {
    id: 'cr-80-cr80-ha',
    machineId: 'cr-80',
    machineLabel: 'CR-80',
    fileName: 'CR80_Ha.wav',
    label: 'CR80 Ha',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/cr-80/CR80_Ha.wav', import.meta.url).href
  },
  {
    id: 'cr-80-cr80-hey',
    machineId: 'cr-80',
    machineLabel: 'CR-80',
    fileName: 'CR80_Hey.wav',
    label: 'CR80 Hey',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/cr-80/CR80_Hey.wav', import.meta.url).href
  },
  {
    id: 'cr-80-cr80-scratch1',
    machineId: 'cr-80',
    machineLabel: 'CR-80',
    fileName: 'CR80_Scratch1.wav',
    label: 'CR80 Scratch1',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/cr-80/CR80_Scratch1.wav', import.meta.url).href
  },
  {
    id: 'cr-80-cr80-scratch2',
    machineId: 'cr-80',
    machineLabel: 'CR-80',
    fileName: 'CR80_Scratch2.wav',
    label: 'CR80 Scratch2',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/cr-80/CR80_Scratch2.wav', import.meta.url).href
  },
  {
    id: 'cr-80-cr80-snare',
    machineId: 'cr-80',
    machineLabel: 'CR-80',
    fileName: 'CR80_Snare.wav',
    label: 'CR80 Snare',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/cr-80/CR80_Snare.wav', import.meta.url).href
  },
  {
    id: 'cr-80-cr80-uuh',
    machineId: 'cr-80',
    machineLabel: 'CR-80',
    fileName: 'CR80_Uuh.wav',
    label: 'CR80 Uuh',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/cr-80/CR80_Uuh.wav', import.meta.url).href
  },
  {
    id: 'generic-percussion-bd0000',
    machineId: 'generic-percussion',
    machineLabel: 'Generic Percussion',
    fileName: 'BD0000.WAV',
    label: 'BD0000',
    suggestedLayer: 'L',
    url: new URL('../assets/drum-sample-bank/generic-percussion/BD0000.WAV', import.meta.url).href
  },
  {
    id: 'generic-percussion-conga-low',
    machineId: 'generic-percussion',
    machineLabel: 'Generic Percussion',
    fileName: 'Conga Low.wav',
    label: 'Conga Low',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/generic-percussion/Conga Low.wav', import.meta.url).href
  },
  {
    id: 'generic-percussion-guiro-1',
    machineId: 'generic-percussion',
    machineLabel: 'Generic Percussion',
    fileName: 'Guiro 1.wav',
    label: 'Guiro 1',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/generic-percussion/Guiro 1.wav', import.meta.url).href
  },
  {
    id: 'generic-percussion-kick',
    machineId: 'generic-percussion',
    machineLabel: 'Generic Percussion',
    fileName: 'Kick.wav',
    label: 'Kick',
    suggestedLayer: 'L',
    url: new URL('../assets/drum-sample-bank/generic-percussion/Kick.wav', import.meta.url).href
  },
  {
    id: 'generic-percussion-snare',
    machineId: 'generic-percussion',
    machineLabel: 'Generic Percussion',
    fileName: 'Snare.wav',
    label: 'Snare',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/generic-percussion/Snare.wav', import.meta.url).href
  },
  {
    id: 'generic-percussion-tamb-1',
    machineId: 'generic-percussion',
    machineLabel: 'Generic Percussion',
    fileName: 'Tamb 1.wav',
    label: 'Tamb 1',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/generic-percussion/Tamb 1.wav', import.meta.url).href
  },
  {
    id: 'generic-percussion-tamb-2',
    machineId: 'generic-percussion',
    machineLabel: 'Generic Percussion',
    fileName: 'Tamb 2.wav',
    label: 'Tamb 2',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/generic-percussion/Tamb 2.wav', import.meta.url).href
  },
  {
    id: 'ha-64-ha64-bd-1',
    machineId: 'ha-64',
    machineLabel: 'HA-64',
    fileName: 'HA64 BD 1   .wav',
    label: 'HA64 BD 1',
    suggestedLayer: 'L',
    url: new URL('../assets/drum-sample-bank/ha-64/HA64 BD 1   .wav', import.meta.url).href
  },
  {
    id: 'ha-64-ha64-hh-1',
    machineId: 'ha-64',
    machineLabel: 'HA-64',
    fileName: 'HA64 HH 1   .wav',
    label: 'HA64 HH 1',
    suggestedLayer: 'H',
    url: new URL('../assets/drum-sample-bank/ha-64/HA64 HH 1   .wav', import.meta.url).href
  },
  {
    id: 'ha-64-ha64-hh-3',
    machineId: 'ha-64',
    machineLabel: 'HA-64',
    fileName: 'HA64 HH 3   .wav',
    label: 'HA64 HH 3',
    suggestedLayer: 'H',
    url: new URL('../assets/drum-sample-bank/ha-64/HA64 HH 3   .wav', import.meta.url).href
  },
  {
    id: 'ha-64-ha64-sd1-1',
    machineId: 'ha-64',
    machineLabel: 'HA-64',
    fileName: 'HA64 SD1.1  .wav',
    label: 'HA64 SD1.1',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/ha-64/HA64 SD1.1  .wav', import.meta.url).href
  },
  {
    id: 'ha-64-ha64-sd1-3',
    machineId: 'ha-64',
    machineLabel: 'HA-64',
    fileName: 'HA64 SD1.3  .wav',
    label: 'HA64 SD1.3',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/ha-64/HA64 SD1.3  .wav', import.meta.url).href
  },
  {
    id: 'ha-64-ha64-sd1-4',
    machineId: 'ha-64',
    machineLabel: 'HA-64',
    fileName: 'HA64 SD1.4  .wav',
    label: 'HA64 SD1.4',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/ha-64/HA64 SD1.4  .wav', import.meta.url).href
  },
  {
    id: 'ha-64-ha64-sd2-1',
    machineId: 'ha-64',
    machineLabel: 'HA-64',
    fileName: 'HA64 SD2.1  .wav',
    label: 'HA64 SD2.1',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/ha-64/HA64 SD2.1  .wav', import.meta.url).href
  },
  {
    id: 'ha-64-ha64-sd2-2',
    machineId: 'ha-64',
    machineLabel: 'HA-64',
    fileName: 'HA64 SD2.2  .wav',
    label: 'HA64 SD2.2',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/ha-64/HA64 SD2.2  .wav', import.meta.url).href
  },
  {
    id: 'korg-minipops-korg-minipops-bd1',
    machineId: 'korg-minipops',
    machineLabel: 'Korg Mini Pops',
    fileName: 'Korg_Minipops bd1.wav',
    label: 'Korg Minipops bd1',
    suggestedLayer: 'L',
    url: new URL('../assets/drum-sample-bank/korg-minipops/Korg_Minipops bd1.wav', import.meta.url).href
  },
  {
    id: 'korg-minipops-korg-minipops-bd2',
    machineId: 'korg-minipops',
    machineLabel: 'Korg Mini Pops',
    fileName: 'Korg_Minipops bd2.wav',
    label: 'Korg Minipops bd2',
    suggestedLayer: 'L',
    url: new URL('../assets/drum-sample-bank/korg-minipops/Korg_Minipops bd2.wav', import.meta.url).href
  },
  {
    id: 'korg-minipops-korg-minipops-hihat1',
    machineId: 'korg-minipops',
    machineLabel: 'Korg Mini Pops',
    fileName: 'Korg_Minipops hihat1.wav',
    label: 'Korg Minipops hihat1',
    suggestedLayer: 'H',
    url: new URL('../assets/drum-sample-bank/korg-minipops/Korg_Minipops hihat1.wav', import.meta.url).href
  },
  {
    id: 'korg-minipops-korg-minipops-sd1',
    machineId: 'korg-minipops',
    machineLabel: 'Korg Mini Pops',
    fileName: 'Korg_Minipops sd1.wav',
    label: 'Korg Minipops sd1',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/korg-minipops/Korg_Minipops sd1.wav', import.meta.url).href
  },
  {
    id: 'kpr-series-kprclaps',
    machineId: 'kpr-series',
    machineLabel: 'Korg KPR Series',
    fileName: 'KPRCLAPS.WAV',
    label: 'KPRCLAPS',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/kpr-series/KPRCLAPS.WAV', import.meta.url).href
  },
  {
    id: 'kpr-series-kprhitom',
    machineId: 'kpr-series',
    machineLabel: 'Korg KPR Series',
    fileName: 'KPRHITOM.WAV',
    label: 'KPRHITOM',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/kpr-series/KPRHITOM.WAV', import.meta.url).href
  },
  {
    id: 'kpr-series-kprkick',
    machineId: 'kpr-series',
    machineLabel: 'Korg KPR Series',
    fileName: 'KPRKICK.WAV',
    label: 'KPRKICK',
    suggestedLayer: 'L',
    url: new URL('../assets/drum-sample-bank/kpr-series/KPRKICK.WAV', import.meta.url).href
  },
  {
    id: 'kpr-series-kprlotom',
    machineId: 'kpr-series',
    machineLabel: 'Korg KPR Series',
    fileName: 'KPRLOTOM.WAV',
    label: 'KPRLOTOM',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/kpr-series/KPRLOTOM.WAV', import.meta.url).href
  },
  {
    id: 'kr-33-kr-33-cow',
    machineId: 'kr-33',
    machineLabel: 'Korg KR-33',
    fileName: 'KR-33 Cow.wav',
    label: 'KR-33 Cow',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/kr-33/KR-33 Cow.wav', import.meta.url).href
  },
  {
    id: 'kr-33-kr-33-hat-cl1',
    machineId: 'kr-33',
    machineLabel: 'Korg KR-33',
    fileName: 'KR-33 Hat-Cl1.wav',
    label: 'KR-33 Hat-Cl1',
    suggestedLayer: 'H',
    url: new URL('../assets/drum-sample-bank/kr-33/KR-33 Hat-Cl1.wav', import.meta.url).href
  },
  {
    id: 'kr-33-kr-33-hat-cl2',
    machineId: 'kr-33',
    machineLabel: 'Korg KR-33',
    fileName: 'KR-33 Hat-Cl2.wav',
    label: 'KR-33 Hat-Cl2',
    suggestedLayer: 'H',
    url: new URL('../assets/drum-sample-bank/kr-33/KR-33 Hat-Cl2.wav', import.meta.url).href
  },
  {
    id: 'kr-33-kr-33-kick1',
    machineId: 'kr-33',
    machineLabel: 'Korg KR-33',
    fileName: 'KR-33 Kick1.wav',
    label: 'KR-33 Kick1',
    suggestedLayer: 'L',
    url: new URL('../assets/drum-sample-bank/kr-33/KR-33 Kick1.wav', import.meta.url).href
  },
  {
    id: 'kr-33-kr-33-kick2',
    machineId: 'kr-33',
    machineLabel: 'Korg KR-33',
    fileName: 'KR-33 Kick2.wav',
    label: 'KR-33 Kick2',
    suggestedLayer: 'L',
    url: new URL('../assets/drum-sample-bank/kr-33/KR-33 Kick2.wav', import.meta.url).href
  },
  {
    id: 'kr-33-kr-33-snare1',
    machineId: 'kr-33',
    machineLabel: 'Korg KR-33',
    fileName: 'KR-33 Snare1.wav',
    label: 'KR-33 Snare1',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/kr-33/KR-33 Snare1.wav', import.meta.url).href
  },
  {
    id: 'kr-33-kr-33-snare2',
    machineId: 'kr-33',
    machineLabel: 'Korg KR-33',
    fileName: 'KR-33 Snare2.wav',
    label: 'KR-33 Snare2',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/kr-33/KR-33 Snare2.wav', import.meta.url).href
  },
  {
    id: 'kr-33-kr-33-tom-hi',
    machineId: 'kr-33',
    machineLabel: 'Korg KR-33',
    fileName: 'KR-33 Tom-Hi.wav',
    label: 'KR-33 Tom-Hi',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/kr-33/KR-33 Tom-Hi.wav', import.meta.url).href
  },
  {
    id: 'kr-33-kr-33-tom-lo',
    machineId: 'kr-33',
    machineLabel: 'Korg KR-33',
    fileName: 'KR-33 Tom-Lo.wav',
    label: 'KR-33 Tom-Lo',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/kr-33/KR-33 Tom-Lo.wav', import.meta.url).href
  },
  {
    id: 'kr-33-kr-33-tom-mid',
    machineId: 'kr-33',
    machineLabel: 'Korg KR-33',
    fileName: 'KR-33 Tom-Mid.wav',
    label: 'KR-33 Tom-Mid',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/kr-33/KR-33 Tom-Mid.wav', import.meta.url).href
  },
  {
    id: 'kr-55-kr55cnga',
    machineId: 'kr-55',
    machineLabel: 'Korg KR-55',
    fileName: 'KR55CNGA.WAV',
    label: 'KR55CNGA',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/kr-55/KR55CNGA.WAV', import.meta.url).href
  },
  {
    id: 'kr-55-kr55cowb',
    machineId: 'kr-55',
    machineLabel: 'Korg KR-55',
    fileName: 'KR55COWB.WAV',
    label: 'KR55COWB',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/kr-55/KR55COWB.WAV', import.meta.url).href
  },
  {
    id: 'kr-55-kr55kick',
    machineId: 'kr-55',
    machineLabel: 'Korg KR-55',
    fileName: 'KR55KICK.WAV',
    label: 'KR55KICK',
    suggestedLayer: 'L',
    url: new URL('../assets/drum-sample-bank/kr-55/KR55KICK.WAV', import.meta.url).href
  },
  {
    id: 'kr-55-kr55rim',
    machineId: 'kr-55',
    machineLabel: 'Korg KR-55',
    fileName: 'KR55RIM.WAV',
    label: 'KR55RIM',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/kr-55/KR55RIM.WAV', import.meta.url).href
  },
  {
    id: 'kr-55-kr55snar',
    machineId: 'kr-55',
    machineLabel: 'Korg KR-55',
    fileName: 'KR55SNAR.WAV',
    label: 'KR55SNAR',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/kr-55/KR55SNAR.WAV', import.meta.url).href
  },
  {
    id: 'kr-55-kr55tom',
    machineId: 'kr-55',
    machineLabel: 'Korg KR-55',
    fileName: 'KR55TOM.WAV',
    label: 'KR55TOM',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/kr-55/KR55TOM.WAV', import.meta.url).href
  },
  {
    id: 'linn-lm-1-linndrum-linndrum-cabasa',
    machineId: 'linn-lm-1-linndrum',
    machineLabel: 'LinnDrum / LM-1',
    fileName: 'linndrum cabasa.wav',
    label: 'linndrum cabasa',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/linn-lm-1-linndrum/linndrum cabasa.wav', import.meta.url).href
  },
  {
    id: 'linn-lm-1-linndrum-linndrum-clap',
    machineId: 'linn-lm-1-linndrum',
    machineLabel: 'LinnDrum / LM-1',
    fileName: 'linndrum clap.wav',
    label: 'linndrum clap',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/linn-lm-1-linndrum/linndrum clap.wav', import.meta.url).href
  },
  {
    id: 'linn-lm-1-linndrum-linndrum-conga',
    machineId: 'linn-lm-1-linndrum',
    machineLabel: 'LinnDrum / LM-1',
    fileName: 'linndrum conga.wav',
    label: 'linndrum conga',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/linn-lm-1-linndrum/linndrum conga.wav', import.meta.url).href
  },
  {
    id: 'linn-lm-1-linndrum-linndrum-congah',
    machineId: 'linn-lm-1-linndrum',
    machineLabel: 'LinnDrum / LM-1',
    fileName: 'linndrum congah.wav',
    label: 'linndrum congah',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/linn-lm-1-linndrum/linndrum congah.wav', import.meta.url).href
  },
  {
    id: 'linn-lm-1-linndrum-linndrum-congahh',
    machineId: 'linn-lm-1-linndrum',
    machineLabel: 'LinnDrum / LM-1',
    fileName: 'linndrum congahh.wav',
    label: 'linndrum congahh',
    suggestedLayer: 'H',
    url: new URL('../assets/drum-sample-bank/linn-lm-1-linndrum/linndrum congahh.wav', import.meta.url).href
  },
  {
    id: 'linn-lm-1-linndrum-linndrum-congal',
    machineId: 'linn-lm-1-linndrum',
    machineLabel: 'LinnDrum / LM-1',
    fileName: 'linndrum congal.wav',
    label: 'linndrum congal',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/linn-lm-1-linndrum/linndrum congal.wav', import.meta.url).href
  },
  {
    id: 'linn-lm-1-linndrum-linndrum-cowb',
    machineId: 'linn-lm-1-linndrum',
    machineLabel: 'LinnDrum / LM-1',
    fileName: 'linndrum cowb.wav',
    label: 'linndrum cowb',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/linn-lm-1-linndrum/linndrum cowb.wav', import.meta.url).href
  },
  {
    id: 'linn-lm-1-linndrum-linndrum-kick',
    machineId: 'linn-lm-1-linndrum',
    machineLabel: 'LinnDrum / LM-1',
    fileName: 'linndrum kick.wav',
    label: 'linndrum kick',
    suggestedLayer: 'L',
    url: new URL('../assets/drum-sample-bank/linn-lm-1-linndrum/linndrum kick.wav', import.meta.url).href
  },
  {
    id: 'linn-lm-1-linndrum-linndrum-kickme',
    machineId: 'linn-lm-1-linndrum',
    machineLabel: 'LinnDrum / LM-1',
    fileName: 'linndrum kickme.wav',
    label: 'linndrum kickme',
    suggestedLayer: 'L',
    url: new URL('../assets/drum-sample-bank/linn-lm-1-linndrum/linndrum kickme.wav', import.meta.url).href
  },
  {
    id: 'linn-lm-1-linndrum-linndrum-sd',
    machineId: 'linn-lm-1-linndrum',
    machineLabel: 'LinnDrum / LM-1',
    fileName: 'linndrum sd.wav',
    label: 'linndrum sd',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/linn-lm-1-linndrum/linndrum sd.wav', import.meta.url).href
  },
  {
    id: 'roland-tr-33-roland-tr-33-kick',
    machineId: 'roland-tr-33',
    machineLabel: 'Roland TR-33',
    fileName: 'Roland_TR-33_Kick.wav',
    label: 'Roland TR-33 Kick',
    suggestedLayer: 'L',
    url: new URL('../assets/drum-sample-bank/roland-tr-33/Roland_TR-33_Kick.wav', import.meta.url).href
  },
  {
    id: 'roland-tr-33-roland-tr-33-snare',
    machineId: 'roland-tr-33',
    machineLabel: 'Roland TR-33',
    fileName: 'Roland_TR-33_Snare.wav',
    label: 'Roland TR-33 Snare',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/roland-tr-33/Roland_TR-33_Snare.wav', import.meta.url).href
  },
  {
    id: 'roland-tr-55-roland-tr-55-hh-cl',
    machineId: 'roland-tr-55',
    machineLabel: 'Roland TR-55',
    fileName: 'Roland_TR-55_HH Cl.wav',
    label: 'Roland TR-55 HH Cl',
    suggestedLayer: 'H',
    url: new URL('../assets/drum-sample-bank/roland-tr-55/Roland_TR-55_HH Cl.wav', import.meta.url).href
  },
  {
    id: 'roland-tr-55-roland-tr-55-hh-op',
    machineId: 'roland-tr-55',
    machineLabel: 'Roland TR-55',
    fileName: 'Roland_TR-55_HH Op.wav',
    label: 'Roland TR-55 HH Op',
    suggestedLayer: 'H',
    url: new URL('../assets/drum-sample-bank/roland-tr-55/Roland_TR-55_HH Op.wav', import.meta.url).href
  },
  {
    id: 'roland-tr-55-roland-tr-55-kick',
    machineId: 'roland-tr-55',
    machineLabel: 'Roland TR-55',
    fileName: 'Roland_TR-55_Kick.wav',
    label: 'Roland TR-55 Kick',
    suggestedLayer: 'L',
    url: new URL('../assets/drum-sample-bank/roland-tr-55/Roland_TR-55_Kick.wav', import.meta.url).href
  },
  {
    id: 'roland-tr-55-roland-tr-55-snare',
    machineId: 'roland-tr-55',
    machineLabel: 'Roland TR-55',
    fileName: 'Roland_TR-55_Snare.wav',
    label: 'Roland TR-55 Snare',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/roland-tr-55/Roland_TR-55_Snare.wav', import.meta.url).href
  },
  {
    id: 'roland-tr-909-roland-tr-909-bt3a0d3',
    machineId: 'roland-tr-909',
    machineLabel: 'Roland TR-909',
    fileName: 'Roland TR-909 BT3A0D3.WAV',
    label: 'Roland TR-909 BT3A0D3',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/roland-tr-909/Roland TR-909 BT3A0D3.WAV', import.meta.url).href
  },
  {
    id: 'roland-tr-909-roland-tr-909-bt3a0d7',
    machineId: 'roland-tr-909',
    machineLabel: 'Roland TR-909',
    fileName: 'Roland TR-909 BT3A0D7.WAV',
    label: 'Roland TR-909 BT3A0D7',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/roland-tr-909/Roland TR-909 BT3A0D7.WAV', import.meta.url).href
  },
  {
    id: 'roland-tr-909-roland-tr-909-bt3a0da',
    machineId: 'roland-tr-909',
    machineLabel: 'Roland TR-909',
    fileName: 'Roland TR-909 BT3A0DA.WAV',
    label: 'Roland TR-909 BT3A0DA',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/roland-tr-909/Roland TR-909 BT3A0DA.WAV', import.meta.url).href
  },
  {
    id: 'roland-tr-909-roland-tr-909-bt7a0d7',
    machineId: 'roland-tr-909',
    machineLabel: 'Roland TR-909',
    fileName: 'Roland TR-909 BT7A0D7.WAV',
    label: 'Roland TR-909 BT7A0D7',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/roland-tr-909/Roland TR-909 BT7A0D7.WAV', import.meta.url).href
  },
  {
    id: 'roland-tr-909-roland-tr-909-bt7a0da',
    machineId: 'roland-tr-909',
    machineLabel: 'Roland TR-909',
    fileName: 'Roland TR-909 BT7A0DA.WAV',
    label: 'Roland TR-909 BT7A0DA',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/roland-tr-909/Roland TR-909 BT7A0DA.WAV', import.meta.url).href
  },
  {
    id: 'roland-tr-909-roland-tr-909-btaa0da',
    machineId: 'roland-tr-909',
    machineLabel: 'Roland TR-909',
    fileName: 'Roland TR-909 BTAA0DA.WAV',
    label: 'Roland TR-909 BTAA0DA',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/roland-tr-909/Roland TR-909 BTAA0DA.WAV', import.meta.url).href
  },
  {
    id: 'roland-tr-909-roland-tr-909-btaaada',
    machineId: 'roland-tr-909',
    machineLabel: 'Roland TR-909',
    fileName: 'Roland TR-909 BTAAADA.WAV',
    label: 'Roland TR-909 BTAAADA',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/roland-tr-909/Roland TR-909 BTAAADA.WAV', import.meta.url).href
  },
  {
    id: 'roland-tr-909-roland-tr-909-handclp1',
    machineId: 'roland-tr-909',
    machineLabel: 'Roland TR-909',
    fileName: 'Roland TR-909 HANDCLP1.WAV',
    label: 'Roland TR-909 HANDCLP1',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/roland-tr-909/Roland TR-909 HANDCLP1.WAV', import.meta.url).href
  },
  {
    id: 'roland-tr-909-roland-tr-909-handclp2',
    machineId: 'roland-tr-909',
    machineLabel: 'Roland TR-909',
    fileName: 'Roland TR-909 HANDCLP2.WAV',
    label: 'Roland TR-909 HANDCLP2',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/roland-tr-909/Roland TR-909 HANDCLP2.WAV', import.meta.url).href
  },
  {
    id: 'roland-tr-909-roland-tr-909-hhcd4',
    machineId: 'roland-tr-909',
    machineLabel: 'Roland TR-909',
    fileName: 'Roland TR-909 HHCD4.WAV',
    label: 'Roland TR-909 HHCD4',
    suggestedLayer: 'H',
    url: new URL('../assets/drum-sample-bank/roland-tr-909/Roland TR-909 HHCD4.WAV', import.meta.url).href
  },
  {
    id: 'roland-tr-909-roland-tr-909-st0t0s0',
    machineId: 'roland-tr-909',
    machineLabel: 'Roland TR-909',
    fileName: 'Roland TR-909 ST0T0S0.WAV',
    label: 'Roland TR-909 ST0T0S0',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/roland-tr-909/Roland TR-909 ST0T0S0.WAV', import.meta.url).href
  },
  {
    id: 'roland-tr-909-roland-tr-909-st3t0s3',
    machineId: 'roland-tr-909',
    machineLabel: 'Roland TR-909',
    fileName: 'Roland TR-909 ST3T0S3.WAV',
    label: 'Roland TR-909 ST3T0S3',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/roland-tr-909/Roland TR-909 ST3T0S3.WAV', import.meta.url).href
  },
  {
    id: 'roland-tr-909-roland-tr-909-st3t0s7',
    machineId: 'roland-tr-909',
    machineLabel: 'Roland TR-909',
    fileName: 'Roland TR-909 ST3T0S7.WAV',
    label: 'Roland TR-909 ST3T0S7',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/roland-tr-909/Roland TR-909 ST3T0S7.WAV', import.meta.url).href
  },
  {
    id: 'roland-tr-909-roland-tr-909-st3t0sa',
    machineId: 'roland-tr-909',
    machineLabel: 'Roland TR-909',
    fileName: 'Roland TR-909 ST3T0SA.WAV',
    label: 'Roland TR-909 ST3T0SA',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/roland-tr-909/Roland TR-909 ST3T0SA.WAV', import.meta.url).href
  },
  {
    id: 'roland-tr-909-roland-tr-909-stat0sa',
    machineId: 'roland-tr-909',
    machineLabel: 'Roland TR-909',
    fileName: 'Roland TR-909 STAT0SA.WAV',
    label: 'Roland TR-909 STAT0SA',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/roland-tr-909/Roland TR-909 STAT0SA.WAV', import.meta.url).href
  },
  {
    id: 'roland-tr-909-roland-tr-909-stat3sa',
    machineId: 'roland-tr-909',
    machineLabel: 'Roland TR-909',
    fileName: 'Roland TR-909 STAT3SA.WAV',
    label: 'Roland TR-909 STAT3SA',
    suggestedLayer: 'M',
    url: new URL('../assets/drum-sample-bank/roland-tr-909/Roland TR-909 STAT3SA.WAV', import.meta.url).href
  },
];

export const USER_DRUM_VOICE_METADATA_BY_FILE: Record<string, DrumVoiceMetadata> = {
  'Acetone_Rhythm-Ace KICK3.WAV': {
    category: 'kick',
    description: 'Bass Drum',
    source: 'user-curated'
  },
  'Acetone_Rhythm-Ace SNARE1.WAV': {
    category: 'snare',
    description: 'Snare Drum',
    source: 'user-curated'
  },
  'Korg_Minipops bd1.wav': {
    category: 'kick',
    description: 'Bass Drum',
    source: 'user-curated'
  },
  'Korg_Minipops bd2.wav': {
    category: 'kick',
    description: 'Bass Drum',
    source: 'user-curated'
  },
  'Korg_Minipops sd1.wav': {
    category: 'snare',
    description: 'Snare Drum',
    source: 'user-curated'
  },
  'KR-33 Kick1.wav': {
    category: 'kick',
    description: 'Bass Drum',
    source: 'user-curated'
  },
  'KR-33 Kick2.wav': {
    category: 'kick',
    description: 'Bass Drum',
    source: 'user-curated'
  },
  'KR-33 Snare1.wav': {
    category: 'snare',
    description: 'Snare Drum',
    source: 'user-curated'
  },
  'KR-33 Snare2.wav': {
    category: 'snare',
    description: 'Snare Drum',
    source: 'user-curated'
  },
  '110CHH.WAV': {
    category: 'hihat',
    description: 'Hi-Hat',
    source: 'user-curated'
  },
  'Acetone_Rhythm-Ace HHCL.WAV': {
    category: 'hihat',
    description: 'Hi-Hat',
    source: 'user-curated'
  },
  'Alesis_HR16A_08.wav': {
    category: 'kick',
    description: 'Bass Drum',
    source: 'user-curated'
  },
  'Alesis_HR16A_09.wav': {
    category: 'sfx',
    description: 'Glass Breaking SFX',
    source: 'user-curated'
  },
  'Alesis_HR16A_10.wav': {
    category: 'maracas',
    description: 'Maracas',
    source: 'user-curated'
  },
  'Alesis_HR16A_14.wav': {
    category: 'hihat',
    description: 'Hi-Hat',
    source: 'user-curated'
  },
  'Alesis_HR16A_16.wav': {
    category: 'hihat',
    description: 'Hi-Hat',
    source: 'user-curated'
  },
  'Alesis_HR16A_17.wav': {
    category: 'clap',
    description: 'Handclap SFX',
    source: 'user-curated'
  },
  'Alesis_HR16A_18.wav': {
    category: 'conga',
    description: 'High Conga',
    source: 'user-curated'
  },
  'Alesis_HR16A_19.wav': {
    category: 'conga',
    description: 'Accent Conga',
    source: 'user-curated'
  },
  'Alesis_HR16A_20.wav': {
    category: 'conga',
    description: 'Low Conga',
    source: 'user-curated'
  },
  'Alesis_HR16A_39.wav': {
    category: 'snare',
    description: 'Snare Drum',
    source: 'user-curated'
  },
  'Alesis_HR16A_43.wav': {
    category: 'snare',
    description: 'Snare Drum',
    source: 'user-curated'
  },
  'Alesis_HR16A_44.wav': {
    category: 'snare',
    description: 'Snare Drum',
    source: 'user-curated'
  },
  'CR80_Ahh.wav': {
    category: 'vocal',
    description: 'Vocal Ahh SFX',
    source: 'user-curated'
  },
  'CR80_Ha.wav': {
    category: 'vocal',
    description: 'Vocal Ha SFX',
    source: 'user-curated'
  },
  'CR80_Hey.wav': {
    category: 'vocal',
    description: 'Vocal Hey SFX',
    source: 'user-curated'
  },
  'CR80_Uuh.wav': {
    category: 'vocal',
    description: 'Vocal Uuh SFX',
    source: 'user-curated'
  },
  'KR-33 Cow.wav': {
    category: 'cowbell',
    description: 'Cowbell',
    source: 'user-curated'
  },
  'Roland_TR-55_HH Cl.wav': {
    category: 'hihat',
    description: 'Hi-Hat',
    source: 'user-curated'
  },
  'Roland_TR-55_HH Op.wav': {
    category: 'hihat',
    description: 'Hi-Hat',
    source: 'user-curated'
  },
  'Roland TR-909 BT3A0D3.WAV': {
    category: 'kick',
    description: 'Bass Drum',
    source: 'user-curated'
  },
  'Roland TR-909 BT3A0D7.WAV': {
    category: 'kick',
    description: 'Bass Drum',
    source: 'user-curated'
  },
  'Roland TR-909 BT3A0DA.WAV': {
    category: 'kick',
    description: 'Bass Drum',
    source: 'user-curated'
  },
  'Roland TR-909 BT7A0D7.WAV': {
    category: 'kick',
    description: 'Bass Drum',
    source: 'user-curated'
  },
  'Roland TR-909 BT7A0DA.WAV': {
    category: 'kick',
    description: 'Bass Drum',
    source: 'user-curated'
  },
  'Roland TR-909 BTAA0DA.WAV': {
    category: 'kick',
    description: 'Bass Drum',
    source: 'user-curated'
  },
  'Roland TR-909 BTAAADA.WAV': {
    category: 'kick',
    description: 'Bass Drum',
    source: 'user-curated'
  },
  'Roland TR-909 HHCD4.WAV': {
    category: 'hihat',
    description: 'Hi-Hat',
    source: 'user-curated'
  },
  'Roland TR-909 ST0T0S0.WAV': {
    category: 'snare',
    description: 'Snare Drum',
    source: 'user-curated'
  },
  'Roland TR-909 ST3T0S3.WAV': {
    category: 'snare',
    description: 'Snare Drum',
    source: 'user-curated'
  },
  'Roland TR-909 ST3T0S7.WAV': {
    category: 'snare',
    description: 'Snare Drum',
    source: 'user-curated'
  },
  'Roland TR-909 ST3T0SA.WAV': {
    category: 'snare',
    description: 'Snare Drum',
    source: 'user-curated'
  },
  'Roland TR-909 STAT0SA.WAV': {
    category: 'snare',
    description: 'Snare Drum',
    source: 'user-curated'
  },
  'Roland TR-909 STAT3SA.WAV': {
    category: 'snare',
    description: 'Snare Drum',
    source: 'user-curated'
  },
  'HA64 SD1.1  .wav': {
    category: 'snare',
    description: 'Snare Drum',
    source: 'user-curated'
  },
  'HA64 SD1.3  .wav': {
    category: 'snare',
    description: 'Snare Drum',
    source: 'user-curated'
  },
  'HA64 SD1.4  .wav': {
    category: 'snare',
    description: 'Snare Drum',
    source: 'user-curated'
  },
  'HA64 SD2.1  .wav': {
    category: 'snare',
    description: 'Snare Drum',
    source: 'user-curated'
  },
  'HA64 SD2.2  .wav': {
    category: 'snare',
    description: 'Snare Drum',
    source: 'user-curated'
  },
  'Roland TR-909 HANDCLP1.WAV': {
    category: 'clap',
    description: 'Handclap SFX',
    source: 'user-curated'
  },
  'Roland TR-909 HANDCLP2.WAV': {
    category: 'clap',
    description: 'Handclap SFX',
    source: 'user-curated'
  }
};

for (const sample of LOCAL_DRUM_SAMPLE_ENTRIES) {
  const metadata = USER_DRUM_VOICE_METADATA_BY_FILE[sample.fileName];
  if (metadata) {
    sample.voiceMetadata = metadata;
  }
}

export function getLocalDrumSampleById(sampleId: string): LocalDrumSampleEntry | null {
  return LOCAL_DRUM_SAMPLE_ENTRIES.find((sample) => sample.id === sampleId) ?? null;
}

export function getLocalDrumSamplesForLayer(layer: LocalDrumLayer): LocalDrumSampleEntry[] {
  return LOCAL_DRUM_SAMPLE_ENTRIES.filter((sample) => sample.suggestedLayer === layer);
}

export function getLocalDrumVoiceMetadata(
  fileName: string
): DrumVoiceMetadata | undefined {
  return USER_DRUM_VOICE_METADATA_BY_FILE[fileName];
}

export function getLocalDrumSamplesMissingVoiceMetadata(): LocalDrumSampleEntry[] {
  return LOCAL_DRUM_SAMPLE_ENTRIES.filter((sample) => !sample.voiceMetadata);
}

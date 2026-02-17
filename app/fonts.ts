import { Instrument_Serif, IBM_Plex_Sans } from 'next/font/google';

export const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400'],
  variable: '--font-instrument-serif',
});

export const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
}); 
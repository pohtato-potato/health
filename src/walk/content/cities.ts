import type { Source } from './types';

/**
 * Each city's height above sea level, rounded, as on Indian railway station boards. From each city's Wikipedia
 * article; a city's height varies across it, so these are the usual figures quoted for its centre. Each city's
 * state or union territory is given here, since the walk crosses some states more than once.
 */
export const CITY_FACTS: Record<string, { heightM: number; state: string }> = {
  Delhi: { heightM: 216, state: 'Delhi' },
  Agra: { heightM: 170, state: 'Uttar Pradesh' },
  Gwalior: { heightM: 197, state: 'Madhya Pradesh' },
  Bhopal: { heightM: 527, state: 'Madhya Pradesh' },
  Nagpur: { heightM: 310, state: 'Maharashtra' },
  Hyderabad: { heightM: 542, state: 'Telangana' },
  Bengaluru: { heightM: 920, state: 'Karnataka' },
  Madurai: { heightM: 134, state: 'Tamil Nadu' },
  Kanyakumari: { heightM: 30, state: 'Tamil Nadu' },
  Chennai: { heightM: 7, state: 'Tamil Nadu' },
  Nellore: { heightM: 18, state: 'Andhra Pradesh' },
  Vijayawada: { heightM: 23, state: 'Andhra Pradesh' },
  Visakhapatnam: { heightM: 45, state: 'Andhra Pradesh' },
  Bhubaneswar: { heightM: 45, state: 'Odisha' },
  Kolkata: { heightM: 9, state: 'West Bengal' },
  Varanasi: { heightM: 81, state: 'Uttar Pradesh' },
  Kanpur: { heightM: 126, state: 'Uttar Pradesh' },
  Jaipur: { heightM: 431, state: 'Rajasthan' },
  Udaipur: { heightM: 598, state: 'Rajasthan' },
  Ahmedabad: { heightM: 53, state: 'Gujarat' },
  Surat: { heightM: 13, state: 'Gujarat' },
  Mumbai: { heightM: 14, state: 'Maharashtra' },
  Pune: { heightM: 560, state: 'Maharashtra' },
  Belagavi: { heightM: 770, state: 'Karnataka' },
  Hubballi: { heightM: 671, state: 'Karnataka' },
  Puducherry: { heightM: 3, state: 'Puducherry' },
  Thiruvananthapuram: { heightM: 10, state: 'Kerala' },
  Kavaratti: { heightM: 2, state: 'Lakshadweep' },
  Panaji: { heightM: 7, state: 'Goa' },
  Daman: { heightM: 12, state: 'Dadra and Nagar Haveli and Daman and Diu' },
  Raipur: { heightM: 298, state: 'Chhattisgarh' },
  'Port Blair': { heightM: 16, state: 'Andaman and Nicobar Islands' },
  Gangtok: { heightM: 1650, state: 'Sikkim' },
  Dispur: { heightM: 55, state: 'Assam' },
  Shillong: { heightM: 1525, state: 'Meghalaya' },
  Agartala: { heightM: 13, state: 'Tripura' },
  Aizawl: { heightM: 1132, state: 'Mizoram' },
  Imphal: { heightM: 786, state: 'Manipur' },
  Kohima: { heightM: 1261, state: 'Nagaland' },
  Itanagar: { heightM: 320, state: 'Arunachal Pradesh' },
  Dehradun: { heightM: 640, state: 'Uttarakhand' },
  Shimla: { heightM: 2205, state: 'Himachal Pradesh' },
  Chandigarh: { heightM: 321, state: 'Chandigarh' },
  Amritsar: { heightM: 234, state: 'Punjab' },
  Srinagar: { heightM: 1585, state: 'Jammu and Kashmir' },
  Leh: { heightM: 3500, state: 'Ladakh' },
};

export const CITY_SOURCES: Source[] = [{ title: 'Wikipedia: each city’s article (elevation in the infobox)' }];

import { ALL_STOPS, POSTCARDS, type Stop } from '../domain/walk';
import { landmarkFor } from './art/landmarks';

/** What to eat and what you'll hear at each stop. Written in-house; kept plain and specific. */
const LOCAL: Record<string, { eat: string; hear: string }> = {
  Delhi: { eat: 'Chole bhature in Paharganj', hear: 'Hindi, Punjabi and Urdu' },
  Agra: { eat: 'Bedai with aloo sabzi, and petha', hear: 'Hindi, and Braj Bhasha nearby' },
  Gwalior: { eat: 'Bedai with aloo sabzi', hear: 'Hindi, and Bundeli nearby' },
  Bhopal: { eat: 'Poha with jalebi', hear: 'Hindi and Urdu' },
  Nagpur: { eat: 'Saoji chicken, and oranges in winter', hear: 'Marathi, and Hindi' },
  Hyderabad: { eat: 'Haleem in Ramzan; biryani all year', hear: 'Telugu and Dakhni Urdu' },
  Bengaluru: { eat: 'Masala dosa and filter coffee', hear: 'Kannada, and a dozen others' },
  Madurai: { eat: 'Jigarthanda', hear: 'Tamil' },
  Kanyakumari: { eat: 'Fish curry and banana chips', hear: 'Tamil and Malayalam' },
  Chennai: { eat: 'Idli, sambar and filter coffee', hear: 'Tamil' },
  Nellore: { eat: 'Nellore chepala pulusu (fish curry)', hear: 'Telugu' },
  Vijayawada: { eat: 'Pesarattu with ginger chutney', hear: 'Telugu' },
  Visakhapatnam: { eat: 'Bongulo chicken (cooked in bamboo) up in Araku', hear: 'Telugu' },
  Bhubaneswar: { eat: 'Dalma, and chhena poda', hear: 'Odia' },
  Kolkata: { eat: 'Kathi rolls and mishti doi', hear: 'Bengali' },
  Varanasi: { eat: 'Kachori sabzi, and malaiyyo in winter', hear: 'Hindi and Bhojpuri' },
  Kanpur: { eat: 'Thaggu ke laddu', hear: 'Hindi' },
  Jaipur: { eat: 'Pyaaz kachori and dal baati churma', hear: 'Hindi and Rajasthani' },
  Udaipur: { eat: 'Dal baati, and gatte ki sabzi', hear: 'Mewari and Hindi' },
  Ahmedabad: { eat: 'Khaman dhokla and fafda', hear: 'Gujarati' },
  Surat: { eat: 'Locho, and undhiyu in winter', hear: 'Gujarati' },
  Mumbai: { eat: 'Vada pav and pav bhaji', hear: 'Marathi, Hindi and everything else' },
  Pune: { eat: 'Misal pav', hear: 'Marathi' },
  Belagavi: { eat: 'Kunda, a caramelised milk sweet', hear: 'Kannada and Marathi' },
  Hubballi: { eat: 'Girmit, a spiced puffed-rice snack', hear: 'Kannada' },
  Puducherry: { eat: 'Fish curry, and crêpes on the promenade', hear: 'Tamil and French' },
  Thiruvananthapuram: { eat: 'Puttu and kadala curry', hear: 'Malayalam' },
  Kavaratti: { eat: 'Tuna with coconut, and mas podi', hear: 'Jeseri (a Malayalam dialect)' },
  Panaji: { eat: 'Fish curry rice, and bebinca', hear: 'Konkani' },
  Daman: { eat: 'Fried fish and Portuguese-style bread', hear: 'Gujarati and Portuguese' },
  Raipur: { eat: 'Chila and fara', hear: 'Chhattisgarhi and Hindi' },
  'Port Blair': { eat: 'Grilled fish and coconut prawns', hear: 'Hindi, Bengali and Tamil' },
  Gangtok: { eat: 'Momos and thukpa', hear: 'Nepali, Bhutia and Lepcha' },
  Dispur: { eat: 'Masor tenga, a sour fish curry', hear: 'Assamese' },
  Shillong: { eat: 'Jadoh, rice cooked with pork', hear: 'Khasi' },
  Agartala: { eat: 'Mui borok, fermented-fish dishes', hear: 'Bengali and Kokborok' },
  Aizawl: { eat: 'Bai, a stew of greens and bamboo shoot', hear: 'Mizo' },
  Imphal: { eat: 'Eromba, mashed vegetables with fermented fish', hear: 'Meitei (Manipuri)' },
  Kohima: { eat: 'Smoked pork with bamboo shoot', hear: 'Nagamese and many Naga languages' },
  Itanagar: { eat: 'Pika pila, a bamboo-shoot pickle', hear: 'Nyishi, Hindi and English' },
  Dehradun: { eat: 'Bal mithai', hear: 'Garhwali and Hindi' },
  Shimla: { eat: 'Siddu with ghee', hear: 'Pahari and Hindi' },
  Chandigarh: { eat: 'Sarson da saag and makki di roti', hear: 'Punjabi and Hindi' },
  Amritsar: { eat: 'Amritsari kulcha, and langar at the Golden Temple', hear: 'Punjabi' },
  Srinagar: { eat: 'Wazwan, and kahwa', hear: 'Kashmiri' },
  Leh: { eat: 'Skyu, a pasta stew, and butter tea', hear: 'Ladakhi' },
};

export interface CityCard {
  city: string;
  stopNo: number;
  stops: number;
  fact: string;
  eat: string;
  hear: string;
  land: string;
  next?: { name: string; km: number };
}

const firstStops = () => {
  const seen = new Set<string>();
  return ALL_STOPS.filter((s) => !seen.has(s.name) && seen.add(s.name));
};

/** A city's details for its postcard: a real fact, the food, the language, the land and the next stop. */
export function cardFor(city: string): CityCard | undefined {
  const stops = firstStops();
  const i = stops.findIndex((s) => s.name === city);
  const local = LOCAL[city];
  if (i < 0 || !local) return undefined;
  const stop = stops[i];
  const next = stops[i + 1];
  const fact = (POSTCARDS[city] ?? '').split(' Next stop')[0];
  const lm = landmarkFor(city);
  return {
    city,
    stopNo: i + 1,
    stops: stops.length,
    fact,
    eat: local.eat,
    hear: local.hear,
    land: lm ? `The way in passes ${lm.label}.` : '',
    next: next ? { name: next.name, km: Math.round(next.km - stop.km) } : undefined,
  };
}

/** Cards for every stop already reached, so nothing is missed. */
export function reachedCards(km: number): CityCard[] {
  return firstStops()
    .filter((s: Stop) => s.km <= km)
    .map((s) => cardFor(s.name))
    .filter((c): c is CityCard => !!c);
}

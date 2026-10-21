/**
 * One souvenir per state and union territory: a made thing, named for where it's from.
 * The shelf is gone; the names are kept for the passport round to decide on.
 */
export const SOUVENIRS: Record<string, { name: string; note: string }> = {
  Delhi: { name: 'Brass key ring', note: 'from a Chandni Chowk stall' },
  Haryana: { name: 'Phulkari coaster', note: 'bright thread on cotton' },
  'Uttar Pradesh': { name: 'Marble inlay tile', note: 'a flower in pietra dura, from Agra' },
  Rajasthan: { name: 'Blue pottery bowl', note: 'from Jaipur' },
  'Madhya Pradesh': { name: 'Sandstone jali', note: 'a carved lattice tile' },
  Maharashtra: { name: 'Paithani bookmark', note: 'silk with a peacock' },
  Telangana: { name: 'Bidriware box', note: 'silver inlay on black metal' },
  'Andhra Pradesh': { name: 'Kondapalli toy', note: 'a light wooden horse' },
  Karnataka: { name: 'Channapatna top', note: 'lacquered wood' },
  'Tamil Nadu': { name: 'Tanjore panel', note: 'a small gilded painting' },
  Odisha: { name: 'Pattachitra card', note: 'painted on cloth' },
  'West Bengal': { name: 'Terracotta horse', note: 'from Bankura' },
  Jharkhand: { name: 'Dokra figure', note: 'lost-wax brass' },
  Bihar: { name: 'Madhubani print', note: 'fish and lotus in ink' },
  Gujarat: { name: 'Kite and manja', note: 'for Uttarayan' },
  Puducherry: { name: 'Handmade paper notebook', note: 'from Auroville' },
  Kerala: { name: 'Coir-bound diary', note: 'and a pinch of pepper' },
  Lakshadweep: { name: 'Shell wind chime', note: 'collected, not bought' },
  Goa: { name: 'Azulejo tile', note: 'blue and white' },
  'Dadra and Nagar Haveli and Daman and Diu': { name: 'Warli painting', note: 'stick figures dancing' },
  Chhattisgarh: { name: 'Bell-metal lamp', note: 'from Bastar' },
  'Andaman and Nicobar Islands': { name: 'Cane basket', note: 'tightly woven' },
  Sikkim: { name: 'Prayer flag string', note: 'five colours' },
  Assam: { name: 'Muga silk scarf', note: 'golden thread' },
  Meghalaya: { name: 'Bamboo cup', note: 'from the living-root villages' },
  Tripura: { name: 'Bamboo lamp', note: 'split and woven' },
  Mizoram: { name: 'Puan weave', note: 'a strip of loom cloth' },
  Manipur: { name: 'Black pottery cup', note: 'from Longpi' },
  Nagaland: { name: 'Beaded bracelet', note: 'red and black' },
  'Arunachal Pradesh': { name: 'Monpa paper', note: 'handmade from bark' },
  Uttarakhand: { name: 'Aipan coaster', note: 'red ochre and rice paste patterns' },
  'Himachal Pradesh': { name: 'Kullu cap', note: 'with its patterned band' },
  Chandigarh: { name: 'Pierre Jeanneret chair postcard', note: 'the city of design' },
  Punjab: { name: 'Phulkari dupatta square', note: 'flowers in silk' },
  'Jammu and Kashmir': { name: 'Papier-mâché box', note: 'painted chinar leaves' },
  Ladakh: { name: 'Pashmina swatch', note: 'and a prayer wheel' },
};

export function souvenirFor(state: string): { name: string; note: string } | undefined {
  return SOUVENIRS[state];
}

/**
 * Ciudades de la República Dominicana con sus coordenadas.
 *
 * Sirve donde hace falta un punto en el mapa sin pedirle a nadie que arrastre
 * un marcador: crear un encuentro desde el portal de iglesias y elegir el
 * destino del modo viaje. Un selector honesto a nivel de ciudad vale más que
 * un mapa que nadie va a mover con precisión.
 */
export const CITIES: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'Santo Domingo', lat: 18.4861, lng: -69.9312 },
  { name: 'Santo Domingo Este', lat: 18.4885, lng: -69.8571 },
  { name: 'Santo Domingo Norte', lat: 18.5787, lng: -69.9128 },
  { name: 'Santo Domingo Oeste', lat: 18.4917, lng: -70.0086 },
  { name: 'Santiago de los Caballeros', lat: 19.4517, lng: -70.697 },
  { name: 'La Vega', lat: 19.2226, lng: -70.5297 },
  { name: 'San Pedro de Macorís', lat: 18.4616, lng: -69.2973 },
  { name: 'La Romana', lat: 18.4273, lng: -68.9728 },
  { name: 'San Francisco de Macorís', lat: 19.3008, lng: -70.2525 },
  { name: 'Puerto Plata', lat: 19.7934, lng: -70.6884 },
  { name: 'Higüey', lat: 18.6151, lng: -68.7079 },
  { name: 'San Cristóbal', lat: 18.4167, lng: -70.1064 },
  { name: 'Moca', lat: 19.3939, lng: -70.5258 },
  { name: 'Baní', lat: 18.2796, lng: -70.3312 },
  { name: 'Punta Cana', lat: 18.5601, lng: -68.3725 },
];

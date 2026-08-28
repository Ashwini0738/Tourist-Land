export type Destination = {
  id: string;
  name: string;
  region: string;
  country: string;
  tagline: string;
  image: number;
  accent: string;
  stat: string;
  description: string;
};

export type Property = {
  id: string;
  title: string;
  location: string;
  size: string;
  price: string;
  type: string;
  image: number;
  verified: boolean;
  description: string;
};

export const destinations: Destination[] = [
  {
    id: 'konkan',
    name: 'Konkan Coast',
    region: 'Maharashtra, India',
    country: 'India',
    tagline: 'Where the forest meets the sea',
    image: require('../assets/images/coastline.jpg'),
    accent: '#d9845f',
    stat: '28° today',
    description:
      'A slower stretch of coast with quiet coves, laterite villages, and long golden evenings.',
  },
  {
    id: 'coorg',
    name: 'Coorg Highlands',
    region: 'Karnataka, India',
    country: 'India',
    tagline: 'Misty mornings, open roads',
    image: require('../assets/images/highlands.jpg'),
    accent: '#73966e',
    stat: '22° today',
    description:
      'Coffee country in the clouds, made for unhurried drives, estate stays, and cool mornings.',
  },
];

export const properties: Property[] = [
  {
    id: 'riverstone-estate',
    title: 'Riverstone Estate',
    location: 'Sakleshpur, Karnataka',
    size: '2.4 acres',
    price: '₹1.85 Cr',
    type: 'Agri-tourism',
    image: require('../assets/images/highlands.jpg'),
    verified: true,
    description:
      'A gently sloping parcel with road access, mature trees, and a seasonal stream along the eastern edge.',
  },
  {
    id: 'sea-wind-grove',
    title: 'Sea Wind Grove',
    location: 'Guhagar, Maharashtra',
    size: '1.1 acres',
    price: '₹92 L',
    type: 'Coastal retreat',
    image: require('../assets/images/coastline.jpg'),
    verified: true,
    description:
      'A private grove ten minutes from the beach, with clear title documents and a quiet village setting.',
  },
];

export const stays = [
  { id: '01', name: 'The Mango House', location: 'Alibaug', price: '₹7,800', rating: '4.9', image: require('../assets/images/coastline.jpg') },
  { id: '02', name: 'Misty Fig Estate', location: 'Coorg', price: '₹6,400', rating: '4.8', image: require('../assets/images/highlands.jpg') },
];
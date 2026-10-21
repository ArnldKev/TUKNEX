export const brandConfig = {
  name: 'TUKNEX',
  slogan: 'La base de tu siguiente nivel',
  location: 'Oxapampa, Perú',
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? '51934631664',
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '',
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? '',
  facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL ?? '',
};

export function getWhatsAppUrl(message = 'Hola TUKNEX, me gustaría conversar sobre mi proyecto.') {
  const phone = brandConfig.whatsapp.replace(/\D/g, '');
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null;
}

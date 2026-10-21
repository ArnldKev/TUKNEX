import * as THREE from 'three';
import type { ServiceKind } from './types';
import { brand } from '@/config/brand';

const palette = {
  navy: brand.colors.navy,
  teal: brand.colors.turquoise,
  pale: '#eaf7f3',
  ink: '#214052',
  muted: '#82959d',
  line: '#e1ebef',
};

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}
function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color = palette.ink,
  weight = 500,
) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Arial, sans-serif`;
  ctx.fillText(value, x, y);
}

/** Local canvas textures: no web font, screenshot or external model requests. */
export function createInterfaceTexture(kind: ServiceKind, title?: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 760;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();
  rounded(ctx, 0, 0, 1200, 760, 0, '#ffffff');
  rounded(ctx, 0, 0, 1200, 49, 0, '#f1f5f7');
  ['#e5b5b1', '#e6ce9a', '#a2c9b8'].forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(29 + index * 22, 24, 5, 0, Math.PI * 2);
    ctx.fill();
  });
  rounded(ctx, 350, 11, 500, 27, 8, '#ffffff');
  text(ctx, 'Tu siguiente nivel, en línea', 493, 29, 13, palette.muted);

  if (kind === 'system') {
    rounded(ctx, 0, 49, 210, 711, 0, palette.navy);
    text(ctx, 'nexo / workspace', 28, 98, 21, '#ffffff', 700);
    ['Vista general', 'Clientes', 'Proyectos', 'Cotizaciones', 'Reportes'].forEach((label, i) => {
      if (i === 0) rounded(ctx, 18, 139 + i * 62, 174, 44, 8, '#14475c');
      text(ctx, label, 36, 168 + i * 62, 16, i === 0 ? '#79e6d4' : '#c0d3df');
    });
    text(ctx, 'Todo tu negocio, conectado.', 255, 118, 31, palette.navy, 700);
    text(ctx, 'Una vista clara para tomar buenas decisiones.', 255, 151, 17, palette.muted);
    ['Tus oportunidades', 'Proyectos activos', 'Tareas de hoy'].forEach((label, index) => {
      rounded(ctx, 255 + index * 294, 195, 270, 123, 14, index === 0 ? palette.pale : '#f6f9fb');
      text(ctx, label, 276 + index * 294, 232, 16, palette.muted);
      text(ctx, ['24', '08', '05'][index], 276 + index * 294, 285, 38, palette.navy, 700);
      text(ctx, '+', 475 + index * 294, 266, 25, palette.teal);
    });
    rounded(ctx, 255, 349, 560, 276, 14, '#f6fafb');
    text(ctx, 'Actividad de tu negocio', 279, 386, 19, palette.navy, 700);
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = palette.line;
      ctx.beginPath();
      ctx.moveTo(279, 425 + i * 48);
      ctx.lineTo(785, 425 + i * 48);
      ctx.stroke();
    }
    ctx.strokeStyle = palette.teal;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(280, 559);
    ctx.bezierCurveTo(350, 530, 370, 560, 425, 505);
    ctx.bezierCurveTo(490, 455, 535, 520, 590, 468);
    ctx.bezierCurveTo(660, 398, 690, 473, 785, 417);
    ctx.stroke();
    rounded(ctx, 844, 349, 269, 276, 14, palette.pale);
    text(ctx, 'Todo bajo control', 866, 389, 18, palette.navy, 700);
    ['Nuevo proyecto', 'Propuesta lista', 'Reunión de inicio', 'Entrega de diseño'].forEach((label, i) => {
      rounded(ctx, 868, 416 + i * 43, 13, 13, 4, i % 2 ? '#8ed6c8' : '#0caa9a');
      text(ctx, label, 895, 427 + i * 43, 14);
    });
  } else if (kind === 'catalog' || kind === 'store') {
    text(ctx, 'nativa.', 53, 115, 36, palette.navy, 700);
    text(ctx, 'Colección     Nuestra historia     Contacto', 655, 108, 16, palette.muted);
    rounded(ctx, 48, 151, 1104, 164, 16, palette.pale);
    text(ctx, 'Lo natural se siente mejor.', 81, 213, 34, palette.navy, 700);
    text(
      ctx,
      kind === 'store'
        ? 'Una tienda diseñada para tu próximo gran paso.'
        : 'Tus productos, siempre a la mano.',
      82,
      253,
      19,
      palette.muted,
    );
    ['Todo', 'Colección', 'Más elegidos'].forEach((label, i) => {
      rounded(ctx, 50 + i * 155, 343, 140, 35, 18, i === 0 ? palette.navy : '#f0f5f5');
      text(ctx, label, 76 + i * 155, 367, 14, i === 0 ? '#ffffff' : palette.ink);
    });
    for (let i = 0; i < 4; i++) {
      const x = 49 + i * 284;
      rounded(ctx, x, 403, 250, 201, 12, ['#e9eee3', '#f0e7dc', '#e3edef', '#edf0de'][i]);
      rounded(ctx, x + 81, 443, 87, 130, 17, ['#b4c89d', '#d0ae8c', '#9dbdc3', '#becb92'][i]);
      rounded(ctx, x + 96, 431, 57, 21, 5, '#304f40');
      rounded(ctx, x + 87, 483, 75, 45, 3, '#ffffffba');
      text(ctx, 'nativa.', x + 102, 511, 16, '#56734b', 600);
      text(
        ctx,
        ['Esencia de bosque', 'Origen natural', 'Calma diaria', 'Tu nuevo ritual'][i],
        x + 3,
        639,
        17,
        palette.navy,
        700,
      );
      text(ctx, 'Conoce este producto', x + 3, 666, 13, palette.muted);
      rounded(ctx, x + 2, 683, 246, 34, 7, i === 1 ? palette.navy : palette.pale);
      text(
        ctx,
        kind === 'store' ? 'Añadir a mi pedido  +' : 'Consultar por WhatsApp  ↗',
        x + 25,
        706,
        14,
        i === 1 ? '#ffffff' : palette.navy,
      );
    }
  } else {
    text(ctx, title ?? 'tu marca.', 56, 114, 31, palette.navy, 700);
    text(ctx, 'Inicio     Tu negocio     Servicios     Contacto', 674, 108, 15, palette.muted);
    rounded(ctx, 0, 153, 1200, 454, 0, '#f1f9f7');
    text(ctx, 'HECHO PARA IR MÁS ALLÁ', 63, 225, 14, '#158c86', 700);
    text(ctx, 'Tu próxima', 60, 303, 68, palette.navy, 700);
    text(ctx, 'gran idea.', 60, 379, 68, palette.navy, 700);
    text(
      ctx,
      kind === 'landing'
        ? 'Una página. Una meta. Nuevas oportunidades.'
        : 'Un espacio digital a la altura de lo que imaginas.',
      65,
      427,
      20,
      palette.muted,
    );
    rounded(ctx, 64, 462, 226, 55, 9, palette.navy);
    text(ctx, 'Descubre lo que sigue  ↗', 86, 495, 16, '#ffffff');
    const gradient = ctx.createLinearGradient(760, 270, 1040, 506);
    gradient.addColorStop(0, '#9ff0dc');
    gradient.addColorStop(0.5, '#1cb9ac');
    gradient.addColorStop(1, '#14717b');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(914, 402, 134, 148, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e5b98e';
    ctx.beginPath();
    ctx.arc(1064, 288, 43, 0, Math.PI * 2);
    ctx.fill();
    rounded(ctx, 781, 529, 300, 19, 12, '#d0e9df');
    ['Diseño con propósito', 'Pensado para tu negocio', 'Listo para crecer'].forEach((label, i) => {
      rounded(ctx, 57 + i * 381, 644, 325, 66, 10, '#f5f8fa');
      text(ctx, label, 79 + i * 381, 683, 17, palette.ink, 600);
    });
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function createPanelTexture(kind: 'web' | 'store' | 'system') {
  const canvas = document.createElement('canvas');
  canvas.width = 440;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();
  rounded(ctx, 0, 0, 440, 200, 24, '#ffffff');
  text(ctx, { web: 'WEB', store: 'TIENDA', system: 'SISTEMA' }[kind], 32, 52, 18, '#079a91', 700);
  text(
    ctx,
    { web: 'Una gran primera impresión.', store: 'Tus productos, más lejos.', system: 'Todo bajo control.' }[
      kind
    ],
    32,
    99,
    25,
    palette.navy,
    700,
  );
  if (kind === 'system') {
    for (let i = 0; i < 12; i++)
      rounded(ctx, 35 + i * 30, 155 - (i % 4) * 10, 17, 10 + (i % 4) * 10, 4, i > 7 ? '#00b5ad' : '#c4e9df');
  } else if (kind === 'store') {
    for (let i = 0; i < 5; i++)
      rounded(ctx, 34 + i * 75, 124, 58, 39, 7, ['#e1e9d6', '#d0e6de', '#e2ded2', '#c7e4df', '#e2e9d6'][i]);
  } else {
    rounded(ctx, 34, 124, 133, 12, 5, '#d5eae6');
    rounded(ctx, 34, 147, 207, 8, 4, '#e8efef');
    rounded(ctx, 292, 124, 105, 36, 8, palette.navy);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

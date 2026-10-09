// Idiomas de la app: español (por defecto), inglés y portugués.
// Los textos de los lugares están en data/traducciones.json; acá van los de las pantallas.

export const IDIOMAS = { es: 'Español', en: 'English', pt: 'Português' };

const TEXTOS = {
  es: {
    'inicio.sub': 'Un paseo con portales al pasado',
    'inicio.texto': 'Caminá por la ciudad. Cuando llegues a un lugar histórico se abre un portal, y vas a ver cómo era hace más de cien años.',
    'inicio.empezar': 'Empezar',
    'inicio.3d': 'o volá sobre la ciudad en 3D',
    'inicio.ajustes': 'Ajustes',
    'musica.apagar': 'Apagar música',
    'musica.prender': 'Prender música',
    'mapa.aria': 'Mapa de Río Gallegos con los portales',
    'tarjeta.lejos': 'Estás lejos de Río Gallegos',
    'tarjeta.buscando': 'Buscando tu ubicación…',
    'tarjeta.todos': 'Ver todos los portales',
    'tarjeta.todosSub': 'Recorré los {n} lugares desde donde estés',
    'tarjeta.cercano': 'Portal más cercano',
    'tarjeta.proximo': 'Próximo portal',
    'tarjeta.estasAca': '¡Estás acá! Tocá para entrar',
    'tarjeta.distancia': 'A {d}, hacia el {dir} · tocá para entrar',
    'portal.titulo': 'Portal',
    'cardinal': ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'],
    'portal.hoy': 'HOY',
    'portal.asiEstaHoy': 'Así está hoy',
    'portal.seAbre': 'Se abre un portal al pasado…',
    'portal.salir': 'Salir del portal',
    'portal.hoyCredito': 'Hoy',
    'portal.tuCamara': 'tu cámara',
    'relacion.lugar': 'foto de este lugar',
    'relacion.epoca': 'foto de época',
    'anio.sf': 's/f',
    'vuelo.h1': 'Río Gallegos desde el cielo',
    'vuelo.texto': 'Un vuelo por la ciudad, la ría, Laguna Azul y Cabo Vírgenes. En cada lugar se abre un portal al pasado.',
    'vuelo.volar': 'Volar',
    'vuelo.aPie': 'o volvé al paseo a pie',
    'vuelo.volver': 'Volver al paseo',
    'vuelo.hacia': 'Volando hacia',
    'vuelo.desde': 'Desde {lugar}',
    'vuelo.pausar': 'Tocá para pausar',
    'vuelo.llegaste': 'Llegaste a',
    'vuelo.seAbre': 'Se abre el portal…',
    'vuelo.terminado': 'Recorrido terminado',
    'vuelo.otraVez': 'Tocá para volar de nuevo',
    'vuelo.pausa': 'En pausa',
    'vuelo.seguir': 'Tocá para seguir volando',
    'frase.bienvenida-paseo': 'Bienvenidos a Río Gallegos. Caminá por la ciudad: cada vez que llegues a un lugar histórico, se va a abrir un portal al pasado.',
    'frase.lejos': 'Parece que no estás en Río Gallegos. No pasa nada: tocá cualquier portal del mapa, o la tarjeta de abajo para ver el recorrido completo.',
    'frase.vuelo-inicio': 'Vamos a volar sobre Río Gallegos. Acomodate y disfrutá del paseo.',
    'frase.vuelo-fin': 'Este fue el recorrido. ¡Gracias por visitar Río Gallegos!',
    'frase.bienvenida': 'Bienvenidos a Río Gallegos, la puerta de la Patagonia austral.'
  },
  en: {
    'inicio.sub': 'A walk through portals to the past',
    'inicio.texto': 'Walk around the city. When you reach a historic place, a portal opens and you will see what it looked like more than a hundred years ago.',
    'inicio.empezar': 'Start',
    'inicio.3d': 'or fly over the city in 3D',
    'inicio.ajustes': 'Settings',
    'musica.apagar': 'Turn music off',
    'musica.prender': 'Turn music on',
    'mapa.aria': 'Map of Río Gallegos with the portals',
    'tarjeta.lejos': 'You are far from Río Gallegos',
    'tarjeta.buscando': 'Finding your location…',
    'tarjeta.todos': 'See all the portals',
    'tarjeta.todosSub': 'Visit the {n} places from wherever you are',
    'tarjeta.cercano': 'Nearest portal',
    'tarjeta.proximo': 'Next portal',
    'tarjeta.estasAca': 'You are here! Tap to enter',
    'tarjeta.distancia': '{d} to the {dir} · tap to enter',
    'portal.titulo': 'Portal',
    'cardinal': ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'],
    'portal.hoy': 'TODAY',
    'portal.asiEstaHoy': 'This is how it looks today',
    'portal.seAbre': 'A portal to the past is opening…',
    'portal.salir': 'Leave the portal',
    'portal.hoyCredito': 'Today',
    'portal.tuCamara': 'your camera',
    'relacion.lugar': 'photo of this place',
    'relacion.epoca': 'photo from the period',
    'anio.sf': 'n.d.',
    'vuelo.h1': 'Río Gallegos from the sky',
    'vuelo.texto': 'A flight over the city, the estuary, Laguna Azul and Cape Vírgenes. A portal to the past opens at every stop.',
    'vuelo.volar': 'Fly',
    'vuelo.aPie': 'or go back to the walking tour',
    'vuelo.volver': 'Back to the walking tour',
    'vuelo.hacia': 'Flying to',
    'vuelo.desde': 'From {lugar}',
    'vuelo.pausar': 'Tap to pause',
    'vuelo.llegaste': 'You have arrived at',
    'vuelo.seAbre': 'The portal is opening…',
    'vuelo.terminado': 'Tour finished',
    'vuelo.otraVez': 'Tap to fly again',
    'vuelo.pausa': 'Paused',
    'vuelo.seguir': 'Tap to keep flying',
    'frase.bienvenida-paseo': 'Welcome to Río Gallegos. Walk around the city: every time you reach a historic place, a portal to the past will open.',
    'frase.lejos': 'It looks like you are not in Río Gallegos. No problem: tap any portal on the map, or the card below to see the whole tour.',
    'frase.vuelo-inicio': "Let's fly over Río Gallegos. Sit back and enjoy the ride.",
    'frase.vuelo-fin': 'That was the tour. Thank you for visiting Río Gallegos!',
    'frase.bienvenida': 'Welcome to Río Gallegos, the gateway to southern Patagonia.'
  },
  pt: {
    'inicio.sub': 'Um passeio com portais para o passado',
    'inicio.texto': 'Caminhe pela cidade. Quando chegar a um lugar histórico, um portal se abre e você vai ver como ele era há mais de cem anos.',
    'inicio.empezar': 'Começar',
    'inicio.3d': 'ou sobrevoe a cidade em 3D',
    'inicio.ajustes': 'Ajustes',
    'musica.apagar': 'Desligar música',
    'musica.prender': 'Ligar música',
    'mapa.aria': 'Mapa de Río Gallegos com os portais',
    'tarjeta.lejos': 'Você está longe de Río Gallegos',
    'tarjeta.buscando': 'Procurando sua localização…',
    'tarjeta.todos': 'Ver todos os portais',
    'tarjeta.todosSub': 'Percorra os {n} lugares de onde você estiver',
    'tarjeta.cercano': 'Portal mais próximo',
    'tarjeta.proximo': 'Próximo portal',
    'tarjeta.estasAca': 'Você está aqui! Toque para entrar',
    'tarjeta.distancia': 'A {d}, rumo ao {dir} · toque para entrar',
    'portal.titulo': 'Portal',
    'cardinal': ['norte', 'nordeste', 'leste', 'sudeste', 'sul', 'sudoeste', 'oeste', 'noroeste'],
    'portal.hoy': 'HOJE',
    'portal.asiEstaHoy': 'Assim está hoje',
    'portal.seAbre': 'Um portal para o passado está se abrindo…',
    'portal.salir': 'Sair do portal',
    'portal.hoyCredito': 'Hoje',
    'portal.tuCamara': 'sua câmera',
    'relacion.lugar': 'foto deste lugar',
    'relacion.epoca': 'foto de época',
    'anio.sf': 's/d',
    'vuelo.h1': 'Río Gallegos visto do céu',
    'vuelo.texto': 'Um voo sobre a cidade, o estuário, a Laguna Azul e o Cabo Vírgenes. Em cada lugar se abre um portal para o passado.',
    'vuelo.volar': 'Voar',
    'vuelo.aPie': 'ou volte ao passeio a pé',
    'vuelo.volver': 'Voltar ao passeio',
    'vuelo.hacia': 'Voando para',
    'vuelo.desde': 'Saindo de {lugar}',
    'vuelo.pausar': 'Toque para pausar',
    'vuelo.llegaste': 'Você chegou a',
    'vuelo.seAbre': 'O portal está se abrindo…',
    'vuelo.terminado': 'Passeio concluído',
    'vuelo.otraVez': 'Toque para voar de novo',
    'vuelo.pausa': 'Em pausa',
    'vuelo.seguir': 'Toque para continuar voando',
    'frase.bienvenida-paseo': 'Bem-vindos a Río Gallegos. Caminhe pela cidade: cada vez que chegar a um lugar histórico, vai se abrir um portal para o passado.',
    'frase.lejos': 'Parece que você não está em Río Gallegos. Não tem problema: toque em qualquer portal do mapa, ou no cartão abaixo para ver o passeio completo.',
    'frase.vuelo-inicio': 'Vamos sobrevoar Río Gallegos. Fique à vontade e aproveite o passeio.',
    'frase.vuelo-fin': 'Esse foi o passeio. Obrigado por visitar Río Gallegos!',
    'frase.bienvenida': 'Bem-vindos a Río Gallegos, a porta de entrada da Patagônia austral.'
  }
};

// Idioma elegido: el guardado, o el del celular si es inglés o portugués; si no, español.
export function idioma() {
  try {
    const guardado = JSON.parse(localStorage.getItem('rgv.idioma'));
    if (guardado in TEXTOS) return guardado;
  } catch { /* sin almacenamiento */ }
  const delCelu = (navigator.language || 'es').slice(0, 2).toLowerCase();
  return delCelu in TEXTOS ? delCelu : 'es';
}

export function cambiarIdioma(nuevo) {
  try { localStorage.setItem('rgv.idioma', JSON.stringify(nuevo)); } catch { /* nada */ }
}

// Código de idioma para la voz del navegador (respaldo de los audios grabados)
export const VOZ_LANG = { es: 'es-AR', en: 'en-US', pt: 'pt-BR' };

export function t(clave, vars = {}) {
  const txt = TEXTOS[idioma()][clave] ?? TEXTOS.es[clave] ?? clave;
  return typeof txt === 'string' ? txt.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') : txt;
}

// Traduce los elementos con data-t (texto) y data-t-aria (aria-label) de la página.
export function traducirPagina() {
  document.documentElement.lang = idioma();
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll('[data-t-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.tAria)); });
}

# Genera los mp3 de narración con voz femenina argentina (es-AR-ElenaNeural).
# Uso, desde la carpeta del proyecto:
#   pip install edge-tts
#   python tools/generar-audios.py .            -> regenera todos
#   python tools/generar-audios.py . catedral   -> solo esos lugares
#   python tools/generar-audios.py . --frases   -> solo las frases de la app
import asyncio, json, sys, os
import edge_tts
VOZ = 'es-AR-ElenaNeural'
base = sys.argv[1]
datos = json.load(open(os.path.join(base, 'data/pois.json'), encoding='utf-8'))
FRASES = {
    'paseo-activado': 'Modo paseo activado. Caminá tranquilo: te aviso cuando llegues a un lugar.',
    'paseo-simulado': 'Modo paseo simulado. Tocá el mapa para moverte.',
    'presente': 'De vuelta al presente.',
    'portal-abierto': '¡Portal abierto! Caminá a través del anillo para viajar al pasado.',
    'bienvenida': 'Bienvenidos a Río Gallegos, la puerta de la Patagonia austral.',
    'bienvenida-paseo': 'Bienvenidos a Río Gallegos. Caminá por la ciudad: cada vez que llegues a un lugar histórico, se va a abrir un portal al pasado.',
    'lejos': 'Parece que no estás en Río Gallegos. No pasa nada: tocá cualquier portal del mapa, o la tarjeta de abajo para ver el recorrido completo.',
    'vuelo-inicio': 'Vamos a volar sobre Río Gallegos. Acomodate y disfrutá del paseo.',
    'vuelo-fin': 'Este fue el recorrido. ¡Gracias por visitar Río Gallegos!',
}
async def gen(texto, destino):
    await edge_tts.Communicate(texto, VOZ, rate='-4%').save(destino)
    print(os.path.basename(destino), os.path.getsize(destino)//1024, 'KB')
async def main():
    solo = set(a for a in sys.argv[2:] if a != '--frases')
    if '--frases' in sys.argv: solo = {'__ninguno__'}
    for p in datos['pois']:
        if solo and p['id'] not in solo: continue
        await gen(f"{p['nombre']}. {p['texto']}", os.path.join(base, p['audio']))
    if solo and solo != {'__ninguno__'}: return
    for k, t in FRASES.items():
        await gen(t, os.path.join(base, f'assets/audio/frase-{k}.mp3'))
asyncio.run(main())

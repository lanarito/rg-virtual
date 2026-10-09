# Genera los mp3 de narración con voz femenina argentina (es-AR-ElenaNeural).
# Uso, desde la carpeta del proyecto:
#   pip install edge-tts
#   python tools/generar-audios.py .            -> regenera todos
#   python tools/generar-audios.py . catedral   -> solo esos lugares
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
}
async def gen(texto, destino):
    await edge_tts.Communicate(texto, VOZ, rate='-4%').save(destino)
    print(os.path.basename(destino), os.path.getsize(destino)//1024, 'KB')
async def main():
    solo = set(sys.argv[2:])
    for p in datos['pois']:
        if solo and p['id'] not in solo: continue
        await gen(f"{p['nombre']}. {p['texto']}", os.path.join(base, p['audio']))
    if solo: return
    for k, t in FRASES.items():
        await gen(t, os.path.join(base, f'assets/audio/frase-{k}.mp3'))
asyncio.run(main())

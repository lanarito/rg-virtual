# Genera los mp3 de narración con voces femeninas:
#   español  -> es-AR-ElenaNeural    (assets/audio/)
#   inglés   -> en-US-AvaNeural      (assets/audio/en/)
#   portugués-> pt-BR-FranciscaNeural (assets/audio/pt/)
# Uso, desde la carpeta del proyecto:
#   pip install edge-tts
#   python tools/generar-audios.py .                        -> todo, en los 3 idiomas
#   python tools/generar-audios.py . catedral plaza-san-martin -> solo esos lugares (3 idiomas)
#   python tools/generar-audios.py . --frases               -> solo las frases de la app
#   python tools/generar-audios.py . --idioma en            -> solo un idioma
import asyncio, json, sys, os
import edge_tts

VOCES = {'es': 'es-AR-ElenaNeural', 'en': 'en-US-AvaNeural', 'pt': 'pt-BR-FranciscaNeural'}
FRASES = ['bienvenida', 'bienvenida-paseo', 'lejos', 'vuelo-inicio', 'vuelo-fin']

base = sys.argv[1]
args = sys.argv[2:]
idiomas = list(VOCES)
if '--idioma' in args:
    i = args.index('--idioma'); idiomas = [args[i + 1]]; del args[i:i + 2]
solo_frases = '--frases' in args
solo = {a for a in args if not a.startswith('--')}

datos = json.load(open(os.path.join(base, 'data/pois.json'), encoding='utf-8'))
trad = json.load(open(os.path.join(base, 'data/traducciones.json'), encoding='utf-8'))
textos_ui = open(os.path.join(base, 'modules/i18n.js'), encoding='utf-8').read()


def texto_frase(lang, clave):
    # Lee la frase desde modules/i18n.js (bloque del idioma)
    bloque = textos_ui[textos_ui.index(f'  {lang}: {{'):]
    linea = bloque[bloque.index(f"'frase.{clave}':"):].split('\n')[0]
    valor = linea.split(':', 1)[1].strip().rstrip(',')
    return valor[1:-1].replace("\\'", "'")


async def gen(texto, destino, voz):
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    await edge_tts.Communicate(texto, voz, rate='-4%').save(destino)
    print(os.path.relpath(destino, base), os.path.getsize(destino) // 1024, 'KB')


async def main():
    for lang in idiomas:
        carpeta = 'assets/audio/' + ('' if lang == 'es' else f'{lang}/')
        if not solo_frases:
            for p in datos['pois']:
                if solo and p['id'] not in solo:
                    continue
                x = p if lang == 'es' else trad[lang]['pois'].get(p['id'])
                if not x:
                    print('sin traducción:', lang, p['id']); continue
                await gen(f"{x['nombre']}. {x['texto']}", os.path.join(base, carpeta, f"{p['id']}.mp3"), VOCES[lang])
        if not solo or solo_frases:
            for clave in FRASES:
                await gen(texto_frase(lang, clave), os.path.join(base, carpeta, f'frase-{clave}.mp3'), VOCES[lang])

asyncio.run(main())

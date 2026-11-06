# Genera los mp3 de narración con voces femeninas:
#   español  -> es-UY-ValentinaNeural (assets/audio/)  acento rioplatense, más lenta y con pausas
#   inglés   -> en-US-AvaNeural      (assets/audio/en/)
#   portugués-> pt-BR-FranciscaNeural (assets/audio/pt/)
# Uso, desde la carpeta del proyecto:
#   pip install edge-tts
#   python tools/generar-audios.py .                        -> todo, en los 3 idiomas
#   python tools/generar-audios.py . catedral plaza-san-martin -> solo esos lugares (3 idiomas)
#   python tools/generar-audios.py . --frases               -> solo las frases de la app
#   python tools/generar-audios.py . --idioma en            -> solo un idioma
# Además guarda en tiempos.json en qué segundo se dice cada palabra: con eso los subtítulos siguen a la voz.
import asyncio, difflib, json, sys, os, re
import edge_tts

VOCES = {'es': 'es-UY-ValentinaNeural', 'en': 'en-US-AvaNeural', 'pt': 'pt-BR-FranciscaNeural'}
# Ajustes por idioma: velocidad, tono y si se agregan pausas suaves entre frases
AJUSTES = {'es': ('-10%', '-2Hz', True), 'en': ('-4%', '+0Hz', False), 'pt': ('-4%', '+0Hz', False)}


def con_pausas(texto):
    # Pausas más largas entre frases y después de los dos puntos: suena más natural y tranquila
    return re.sub(r'([.!?]) ', lambda m: m.group(1) + '.. ', texto).replace(': ', '... ')

# Cómo se pronuncian algunas siglas y abreviaturas (solo para la voz; en pantalla queda igual)
PRONUNCIACION = {
    'es': [(r'\bYCF\b', 'i ce efe'), (r'N°\s?(\d)', r'Número \1'), (r'\bAv\.', 'Avenida')],
    'en': [(r'\bYCF\b', 'Y C F'), (r'No\.\s?(\d)', r'Number \1')],
    'pt': [(r'\bYCF\b', 'ípsilon cê efe'), (r'Nº\s?(\d)', r'Número \1')],
}


def pronunciar(texto, lang):
    for patron, reemplazo in PRONUNCIACION[lang]:
        texto = re.sub(patron, reemplazo, texto)
    return texto


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


def normal(palabra):
    return re.sub(r'[\W_]', '', palabra.lower())


def alinear(texto, dichas):
    # Segundo en que empieza cada palabra del texto en pantalla. La voz puede decirlas distinto
    # ("YCF" -> "i ce efe"): esas se ubican entre sus vecinas.
    pantalla = texto.split()
    a, b = [normal(p) for p in pantalla], [normal(w) for _, w in dichas]
    tiempos = [None] * len(pantalla)
    for m in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        for k in range(m.size):
            tiempos[m.a + k] = dichas[m.b + k][0]
    conocidos = [i for i, x in enumerate(tiempos) if x is not None]
    for i, x in enumerate(tiempos):
        if x is not None: continue
        antes = max((k for k in conocidos if k < i), default=None)
        despues = min((k for k in conocidos if k > i), default=None)
        if antes is None: tiempos[i] = tiempos[despues]
        elif despues is None: tiempos[i] = tiempos[antes] + 0.35 * (i - antes)
        else: tiempos[i] = tiempos[antes] + (tiempos[despues] - tiempos[antes]) * (i - antes) / (despues - antes)
    return [round(x, 2) for x in tiempos], len(conocidos) / len(pantalla)


async def gen(texto, destino, voz, lang, titulo=None):
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    rate, pitch, pausas = AJUSTES[lang]
    cuerpo = pronunciar(texto, lang)
    if pausas:
        cuerpo = con_pausas(cuerpo)
    # El nombre del lugar va con una pausa corta, sin el silencio largo de las demás frases
    final = f"{pronunciar(titulo, lang)}. {cuerpo}" if titulo else cuerpo
    # Reintenta si se corta internet (un archivo a medio generar no sirve)
    for intento in range(4):
        try:
            audio, dichas = bytearray(), []
            async for parte in edge_tts.Communicate(final, voz, rate=rate, pitch=pitch, boundary='WordBoundary').stream():
                if parte['type'] == 'audio': audio += parte['data']
                elif parte['type'] == 'WordBoundary':
                    # A veces una marca trae varias palabras juntas ("noviembre de 1930")
                    dichas += [(parte['offset'] / 1e7, w) for w in parte['text'].split()]
            if len(audio) > 5000 and dichas:
                break
        except Exception as e:
            print('reintento', intento + 1, os.path.basename(destino), type(e).__name__)
        await asyncio.sleep(3 * (intento + 1))
    else:
        raise SystemExit(f'No se pudo generar {destino}')
    with open(destino, 'wb') as f:
        f.write(audio)
    # Se alinea con el título incluido, y después se sacan sus palabras: los tiempos son solo del texto
    tiempos, acierto = alinear(f'{titulo} {texto}' if titulo else texto, dichas)
    tiempos = tiempos[len(titulo.split()):] if titulo else tiempos
    print(os.path.relpath(destino, base), len(audio) // 1024, 'KB', f'palabras alineadas {acierto:.0%}')
    return tiempos


async def main():
    for lang in idiomas:
        carpeta = 'assets/audio/' + ('' if lang == 'es' else f'{lang}/')
        ruta = os.path.join(base, carpeta, 'tiempos.json')
        tiempos = json.load(open(ruta, encoding='utf-8')) if os.path.exists(ruta) else {}
        if not solo_frases:
            for p in datos['pois']:
                if solo and p['id'] not in solo:
                    continue
                x = p if lang == 'es' else trad[lang]['pois'].get(p['id'])
                if not x:
                    print('sin traducción:', lang, p['id']); continue
                tiempos[p['id']] = await gen(x['texto'], os.path.join(base, carpeta, f"{p['id']}.mp3"), VOCES[lang], lang, titulo=x['nombre'])
        if not solo or solo_frases:
            for clave in FRASES:
                tiempos[f'frase-{clave}'] = await gen(texto_frase(lang, clave), os.path.join(base, carpeta, f'frase-{clave}.mp3'), VOCES[lang], lang)
        json.dump(tiempos, open(ruta, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

asyncio.run(main())

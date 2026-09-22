# 🌻 Jardín Eterno de Flores Amarillas (21 de Septiembre)

Una experiencia web 3D interactiva, cinematográfica y romántica desarrollada con **Three.js**, **WebGL Shaders** y **Web Audio API**.

Diseñada especialmente como un regalo especial para parejas a distancia por la tradición de las **Flores Amarillas**.

---

## ✨ Características Principales

1. **Ramo 3D Interactivo y Procedural:**
   - Girasoles detallados con espirales de Fibonacci en el centro floral.
   - Pétalos de doble capa con física de curvatura natural y materiales dorados translúcidos.
   - Animación de **florecimiento orgánico (*bloom*)** al abrir el regalo.
   - Viento suave que mece los tallos y hojas de forma continua.
2. **Ambiente & Post-procesado Cinematográfico:**
   - Iluminación *Golden Hour* (atardecer dorado) con luces direccionales y rim-lighting.
   - *UnrealBloomPass* para destellos y auras mágicas doradas.
   - Enjambre de **luciérnagas pulsantes** y partículas de **polen flotante**.
3. **Música Integrada (Web Audio API & Soporte MP3):**
   - Reproductor con sintetizador procedural de caja de música que interpreta una melodía romántica y suave sin requerir descargas externas.
   - Soporte opcional para canción propia: basta con colocar tu archivo en `assets/musica.mp3`.
4. **Carta de Amor y Dedicatoria Personalizable:**
   - Ventana con efecto de cristal (*glassmorphism*) y sello de cera.
   - Editor integrado directamente en la web para personalizar el destinatario, el mensaje y la firma.
   - **Generador de Enlace Personalizado:** Puedes compartir un enlace directo con los nombres y mensaje ya precargados (vía URL params) para enviarlo por WhatsApp.
5. **Interacción Táctil y Órbita 3D:**
   - Compatible con smartphones y computadoras.
   - Toca o haz clic en cualquier lugar para desatar estelas de chispas y pétalos dorados.
   - Controles orbitales suaves con rotación automática opcional.

---

## 🚀 Cómo Probarlo Localmente

Puedes abrir directamente el archivo `index.html` en tu navegador o levantarlo con cualquier servidor local:

### Opción A: Con Python (Recomendado)
```bash
python3 -m http.server 3000
```
Luego abre en tu navegador: [http://localhost:3000](http://localhost:3000)

### Opción B: Con Node.js / npx
```bash
npx serve .
```

---

## 🌐 Cómo Publicarlo Gratis en GitHub Pages (para enviarle el link)

1. Inicializa el repositorio si no lo has hecho:
   ```bash
   git init
   git add .
   git commit -m "Jardín de Flores Amarillas 🌻"
   ```
2. Crea un repositorio en tu cuenta de GitHub (por ejemplo `flores-amarillas`) y súbelo:
   ```bash
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/flores-amarillas.git
   git push -u origin main
   ```
3. Ve a **Settings** -> **Pages** en tu repositorio de GitHub, selecciona la rama `main` y guarda.
4. En 1 minuto tendrás un enlace público como:
   `https://TU_USUARIO.github.io/flores-amarillas/`
   ¡Listo para enviárselo por WhatsApp con su mensaje personalizado!

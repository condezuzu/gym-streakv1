# 💪 Gym Tracker

Una página web simple para registrar tus días de gym con foto, calendario visual y sistema de rachas.

## 🚀 Funcionalidades

- 📸 **Registro con foto**: cada día que vas al gym te sacás una foto desde la cámara para que el día "cuente"
- 📅 **Calendario anual** (2026-2027) con los días coloreados según el estado:
  - Días registrados con colores que evolucionan según tu racha (rojo → blanco)
  - Días de descanso en verde oscuro
  - Días que no fuiste en rojo oscuro
  - Días futuros en gris neutro
- 🔥 **Sistema de racha**: contador de días seguidos, ignora los días de descanso
- 🖼️ **Galería**: todas tus fotos en un solo lugar, con opción de descargar
- ⚙️ **Días de descanso configurables**: cambialos cuando quieras sin afectar la racha
- 💾 **Persistencia local**: todos los datos se guardan en tu dispositivo

## 🎨 Sistema de colores de racha

Cada 10 días tu racha sube de "rango" y los días en el calendario cambian de color:

| Rango | Color |
|-------|-------|
| Días 1-10 | 🔴 Rojo |
| Días 11-20 | 🟠 Naranja/Rosa |
| Días 21-30 | 🟣 Magenta |
| Días 31-40 | 🟪 Violeta |
| Días 41-50 | 🟦 Azul |
| Días 51-60 | Azul claro |
| Días 61-70 | Azul muy claro |
| Días 71+ | ⚪ Blanco brillante |

## 📂 Estructura del proyecto

```
gym-tracker/
├── index.html
├── style.css
├── script.js
└── README.md
```

## 🌐 Cómo subirlo a GitHub y publicarlo

### 1. Crear el repositorio
1. Andá a [github.com](https://github.com) y dale a **New repository**
2. Nombre del repo: `gym-tracker` (o el que quieras)
3. Marcá **Public**
4. Dale a **Create repository**

### 2. Subir los archivos
Tenés dos opciones:

**Opción A - Por la web (más fácil):**
1. En tu repo nuevo, dale a **uploading an existing file**
2. Arrastrá los 3 archivos: `index.html`, `style.css`, `script.js`
3. Dale a **Commit changes**

**Opción B - Por terminal:**
```bash
git clone https://github.com/TU-USUARIO/gym-tracker.git
cd gym-tracker
# Copiá los archivos a la carpeta
git add .
git commit -m "Primera versión"
git push
```

### 3. Activar GitHub Pages (para tener una URL pública)
1. En tu repo, andá a **Settings**
2. En el menú lateral, dale a **Pages**
3. En **Source**, elegí la rama `main` y la carpeta `/ (root)`
4. Dale a **Save**
5. Esperá 1-2 minutos y tu página va a estar en: `https://TU-USUARIO.github.io/gym-tracker/`

## 📱 Cómo usar la página

1. Abrila desde el celular en el navegador
2. Andá a **Ajustes** y marcá tus días de descanso semanales
3. Tocá el botón **REGISTRAR DÍA** para empezar
4. Se abre la cámara → te sacás la foto → ¡listo, día registrado!
5. En el **Calendario** podés ver todos tus días y tocar cualquiera para ver la foto
6. En la **Galería** ves todas las fotos juntas

## ⚠️ Importante

- Los datos se guardan **solo en el navegador** del dispositivo donde uses la app
- Si limpiás los datos del navegador o cambiás de dispositivo, se pierden
- Para que la cámara funcione, la página necesita estar servida por HTTPS (GitHub Pages te lo da automático)

## 🎨 Paleta de colores

Basada en grises neutros con acentos de color para los rangos de racha.

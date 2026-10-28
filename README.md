# DEPÓSITO CERO

Aventura forense noir ochentera de Nicolau Ferrer: una cinta de 1987, un puente Z80 y un archivo imposible.

[Jugar en el navegador](https://xesco-tejedor.github.io/deposito-cero/)

## Android (APK)

[Descargar Depósito Cero 1.0](https://github.com/Xesco-Tejedor/deposito-cero/releases/download/android-v1.0/deposito-cero-1.0.apk)

[Versión publicada, comprobaciones y suma SHA-256](https://github.com/Xesco-Tejedor/deposito-cero/releases/tag/android-v1.0)

- Android 8.0 o posterior. No necesita Chrome ni abrir el navegador para jugar.
- Juego v17 incluido en la aplicación: ilustraciones, música original con saxo sintetizado, tipografía y guía completa funcionan sin conexión.
- En GUÍA, pulsa **GUÍA PASO A PASO · TODOS LOS FINALES**. Incluye las cinco piezas, Portell, sincronía, PREMIS, los dos finales y ayuda para atascos. Contiene spoilers. CERRAR GUÍA vuelve a la partida.
- Guardado automático local. CONTINUAR recupera la partida al volver a abrir. La partida del navegador no se importa automáticamente.
- NUEVA PARTIDA, REINICIAR y alcanzar cualquiera de los finales borran el guardado, igual que en la versión web.
- No solicita permisos de red, micrófono, ubicación ni almacenamiento compartido. Los enlaces externos solo se abren si los tocas y requieren una aplicación compatible.

### Instalar

1. Descarga el archivo `.apk` desde el enlace de arriba.
2. Ábrelo desde Descargas. Si Android lo pide, permite instalar aplicaciones de esa fuente (el navegador o el gestor de archivos usado).
3. Instala y abre **Depósito Cero**. Puedes volver a desactivar el permiso de instalación de esa fuente.

APK firmado con una clave propia del proyecto. No se ha publicado en Google Play. Android puede pedir una comprobación de seguridad para una aplicación instalada fuera de la tienda; no es necesario desactivar la protección general del dispositivo.

### Verificación

Compilación y firma verificadas. Instalado y probado en emulador Android 15 con Wi-Fi y datos desactivados: recorrido completo hasta LA MEVA MÀ, inventario, conversaciones, montaje, sincronía, PREMIS, guardado y relanzamiento, audio y guía. Los controles principales se prueban con toques; algunas transiciones del recorrido se automatizan. No equivale a una prueba en todos los teléfonos Android ni sustituye la experiencia en un dispositivo físico. La guía se revisa también a 320 y 390 píxeles.

Las pruebas y sus capturas se incluyen en `android-evidence.tar.gz`, junto a la release. La suma SHA-256 del APK está en `SHA256SUMS.txt`.

## Compilar

El flujo `.github/workflows/android.yml` contiene las fuentes de la pequeña aplicación Android y las pruebas. Empaqueta los archivos web sin cambiar la web publicada. Usa Android SDK 35 y Java 17. La firma requiere los secretos del repositorio `DC_KEYSTORE_B64` y `DC_KEYSTORE_PASS`; nunca se incluyen claves privadas en el código.

La fuente Space Grotesk se incluye bajo SIL Open Font License, con su licencia dentro del APK. Las imágenes y el audio del juego se conservan de la versión web; no se ha cambiado la historia ni las decisiones de Portell para esta adaptación.

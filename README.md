# Quiniela AI Studio Móvil · Escrutinio

Primera app Android independiente de Quiniela AI Studio. Su único objetivo por
ahora es comprobar los aciertos de un TXT para una temporada y jornada, consultar
marcadores y mostrar premios cuando el escrutinio definitivo está publicado.

## Uso

1. Pulsa **Actualizar datos** para descargar calendario y escrutinios de WIN1X2.
2. Elige temporada y jornada o pulsa **En curso**.
3. Pulsa **Importar apuestas TXT** y selecciona el archivo. Se aceptan líneas
   con 14 signos `1/X/2` o 14 signos más los dos goles del Pleno (`0/1/2/M`).
4. Consulta los resultados por partido. Los premios solo se calculan cuando el
   PRE contiene el escrutinio definitivo. Marcadores provisionales muestran
   aciertos parciales y pendientes, nunca una estimación de dinero.

La app guarda datos y apuestas en el teléfono y vuelve a mostrarlos sin conexión.
El cálculo corresponde al TXT importado; no acredita que el boleto se haya
sellado o pagado. La app no envía apuestas ni realiza pagos.

## Compilar

Con Android SDK 35 y JDK 17:

```bash
cd android
./gradlew assembleDebug
```

El APK de pruebas queda en `android/app/build/outputs/apk/debug/app-debug.apk`.
La clave de publicación, si se configura más adelante, debe mantenerse fuera
del repositorio.

## Pruebas locales

```bash
node --test tests/*.test.cjs
cd android && ./gradlew lintDebug assembleDebug
```

La prueba en dispositivo se realizó en un Samsung Galaxy S20+ (SM-G986N,
Android 13):
descarga de jornadas, selección de temporadas, importación de TXT válido e
inválido, lectura del escrutinio definitivo, desglose de premios y restauración
de apuestas tras reiniciar. El marcador en directo puede no publicar la
temporada/jornada elegida; la app conserva los equipos seleccionados y no
asocia un resultado externo si no coincide con ellos.

## Alcance actual

Esta versión no crea quinielas, no genera sistemas, no optimiza presupuestos y
no comparte datos con el escritorio. La siguiente fase podrá añadir más partes
del producto después de validar esta pantalla de Escrutinio en Android.

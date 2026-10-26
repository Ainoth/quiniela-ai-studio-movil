# Quiniela AI Studio Móvil

La app conserva sus secciones de pronósticos, filtros, análisis, sistemas y
ajustes, y añade una pestaña **Escrutinio** para comprobar apuestas por jornada.
Los datos de WIN1X2 se descargan directamente al teléfono.

## Escrutinio

1. Abre **Escrutinio** en la barra inferior.
2. Descarga los datos o selecciona temporada y jornada.
3. Importa un TXT de apuestas o usa el desarrollo actual.
4. Consulta marcadores y aciertos por partido. Los premios solo se calculan
   cuando WIN1X2 publica el escrutinio definitivo en PRE.

Las apuestas importadas y los datos permanecen en el teléfono. Un TXT solo se
comprueba localmente; la app no envía apuestas ni realiza pagos.

La versión 0.2.3 requiere Android 6.0 (API 23) o posterior.

El código de la app exclusiva de escrutinio que precedió a la integración está
conservado en la rama `escrutinio-autonomo` (versión 0.1.3).

## Compilar

Con Android SDK 35 y JDK 17:

```bash
cd android
./gradlew assembleDebug
```

El APK de pruebas queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

## Estimación orientativa

Durante los partidos, **Consultar estimación de Quinielista** abre su cálculo
orientativo en el navegador. Puede variar respecto al premio definitivo; el
desglose propio de la app usa los importes oficiales de WIN1X2.

## Verificación

```bash
node --test tests/*.test.cjs
cd android && ./gradlew lintDebug assembleDebug
```

La app no calcula importes con marcadores provisionales y valida que los equipos
del marcador coincidan con la jornada seleccionada.

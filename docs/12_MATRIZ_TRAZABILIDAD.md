# Matriz de trazabilidad

| Requisito | Estado | Verificación |
|---|---|---|
| RF-MOV-016 · determinar dobles/triples solo mediante histórico seleccionado y porcentajes actuales | Implementado v0.5.2 | `historicalBase` decide cantidad y cobertura antes de aplicar el factor sorpresa |
| RF-MOV-017 · separar factor sorpresa y diferenciación del público | Implementado v0.5.2 | el factor solo reubica dobles/triples y conserva anchos/cantidad |
| RF-MOV-018 · alternar Pleno automático y manual | Implementado v0.5.2 | botón alterna estado y deja los goles seleccionados editables |
| RF-MOV-019 · elegir cantidades exactas y rachas permitidas | Implementado v0.5.2 | casillas independientes por valor; compatibilidad con filtros previos |
| RF-MOV-020 · ajustar tamaño y distribución de botones en Sistemas y Escrutinio | Implementado v0.5.2 | botones de sistema alineados a la derecha; controles de Escrutinio a ancho completo |
| RF-MOV-021 · mostrar etiquetas de valores encima de las casillas de Condiciones | Implementado v0.5.3 | cabeceras numeradas, casillas vacías y menor altura |
| RF-MOV-022 · mantener las casillas de Condiciones cuadradas y compactas | Implementado v0.5.4 | min-height global anulada; altura de 18 px y ancho sin cambios |
| RF-MOV-023 · calcular cantidades y rachas permitidas desde temporadas históricas | Implementado v0.5.5 | selección por frecuencias históricas con objetivo de cobertura configurable y actualización automática al cambiar muestra o cobertura |
| RF-MOV-024 · aumentar levemente la altura de las casillas de Condiciones | Implementado v0.5.5 | altura de 20 px, ancho conservado |
| RF-MOV-025 · elegir riesgo mínimo, bajo, medio, alto o muy alto al ajustar Condiciones automáticamente | Implementado v0.5.6 | mínimo conserva 97% de cobertura y muy alto 50%; al subir riesgo se estrecha el filtro y aumenta la probabilidad de exclusión |
| RF-MOV-014 · completar automáticamente las selecciones del Pleno | Implementado v0.5.1 | marginales del mercado y respaldo por frecuencias históricas por temporadas; selección manual disponible |
| RF-MOV-015 · facilitar lectura visual de Condiciones y controles | Implementado v0.5.1 | filas coloreadas por signo y botones más compactos sin reducir su texto |
| RF-MOV-012 · simplificar navegación y unificar estrategia de sorpresa/público | Implementado v0.5.0 | selector único, reducciones plegables en Quiniela, Ajustes al final |
| RF-MOV-013 · mostrar equipos de Pleno y compactar Escrutinio | Implementado v0.5.0 | nombres desde el calendario WIN1X2, día/hora bajo el número de partido y controles compactos |
| RF-MOV-008 · generar base histórica o configurar manualmente fijos, dobles y triples | Implementado v0.5.0 | temporadas seleccionadas visibles en modo automático; cantidades bloqueadas salvo modo manual |
| RF-MOV-009 · reducir el desarrollo al presupuesto y restaurar el original | Implementado v0.5.0 | sección plegable integrada en Quiniela; subconjunto priorizado por probabilidad y diversidad |
| RF-MOV-010 · ordenar partidos según posibilidad de que falle el signo favorito | Implementado v0.5.0 | estrategia combinada 0–10; ordena riesgos y, si hay ambas fuentes, diferencia signos menos populares |
| RF-MOV-011 · aplicar tablas reducidas oficiales | Implementado v0.5.0 | seis tablas disponibles dentro de la sección plegable de Quiniela |
| RF-MOV-001 · elegir jornada, importar TXT y mostrar aciertos por apuesta | Implementado v0.2.2 | `tests/escrutinio.test.cjs`; selector y validación de TXT |
| RF-MOV-002 · premios solo con PRE definitivo | Implementado v0.2.2 | `tests/escrutinio.test.cjs`; lectura PRE y desglose de premios |
| RF-MOV-003 · guardar y restaurar la jornada/apuestas localmente | Implementado v0.2.2 | apuestas almacenadas en el estado local de Quiniela AI Studio, asociadas a temporada/jornada |
| RF-MOV-004 · identificar en Android la app como Quiniela AI Studio | Implementado v0.2.2 | etiqueta Android y barra inferior |
| RF-MOV-005 · abrir el escrutinio desde la app completa | Implementado v0.2.2 | pestaña inferior Escrutinio; importa TXT o usa el desarrollo actual |
| RF-MOV-006 · ver aciertos, fallos y pendientes durante los partidos | Implementado v0.2.3 | resumen de la mejor apuesta y actualización automática cada minuto |
| RF-MOV-007 · consultar previsión orientativa de premios dentro de la app | Implementado v0.2.4 | recaudación, bote y porcentajes publicados; escenario con marcadores actuales y favoritos pendientes; mantiene el desglose PRE oficial |

| RF-MOV-026 · aplicar condiciones al desarrollo y mostrar el resultado | Implementado v0.5.8 | acción explícita para regenerar desde la base con filtros activos; pruebas verifican el cambio del conjunto de apuestas |

| RF-MOV-027 · mostrar siempre apuestas y coste sin reducción y tras condiciones | Implementado v0.5.9 | franja fija sobre la navegación con conteos derivados de la base, el Pleno y los filtros activos |

| RF-MOV-028 · mantener coherentes el conteo de base y el resumen fijo tras las reducciones | Implementado v0.5.10 | resumen usa la base vigente y solo toma copia original mientras la reducción oficial coincide con la base actual |
| RF-MOV-029 · mejorar legibilidad del resumen fijo | Implementado v0.5.10 | tipografía de etiquetas y cifras ampliada |

| RF-MOV-030 · distinguir visualmente los dos bloques del resumen fijo | Implementado v0.5.11 | separador vertical contrastado entre cifras sin reducción y con condiciones |

| RF-MOV-031 · quitar candados y corregir la lectura de porcentajes de los partidos | Implementado v0.5.12 | elimina controles de bloqueo; muestra 1/X/2 como porcentajes redondeados desde fracciones normalizadas y separa el riesgo estimado |

| RF-MOV-032 · mostrar cada partido en una sola línea compacta | Implementado v0.5.13 | número, local, visitante, tres porcentajes entre corchetes y botones 1/X/2; sin línea adicional de riesgo |

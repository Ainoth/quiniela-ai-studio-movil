# Matriz de trazabilidad

| Requisito | Estado | Verificación |
|---|---|---|
| RF-MOV-001 · elegir jornada, importar TXT y mostrar aciertos por apuesta | Implementado v0.1.1 | `tests/escrutinio.test.cjs`; probado en Galaxy S20+: selector, SAF, TXT válido/inválido y 14 signos |
| RF-MOV-002 · premios solo con PRE definitivo | Implementado v0.1.1 | `tests/escrutinio.test.cjs`; tarjeta de premios verificada en jornada finalizada desde PRE |
| RF-MOV-003 · guardar y restaurar la jornada/apuestas localmente | Implementado v0.1.1 | reinicio real de la app y restauración de temporada, jornada y TXT en Galaxy S20+ |

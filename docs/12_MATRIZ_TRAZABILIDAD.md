# Matriz de trazabilidad

| Requisito | Estado | Verificación |
|---|---|---|
| RF-MOV-001 · elegir jornada, importar TXT y mostrar aciertos por apuesta | Implementado v0.1.2 | `tests/escrutinio.test.cjs`; probado en Galaxy S20+: selector, SAF, TXT válido/inválido y 14 signos |
| RF-MOV-002 · premios solo con PRE definitivo | Implementado v0.1.2 | `tests/escrutinio.test.cjs`; tarjeta de premios verificada en jornada finalizada desde PRE |
| RF-MOV-003 · guardar y restaurar la jornada/apuestas localmente | Implementado v0.1.2 | reinicio real de la app y restauración de temporada, jornada y TXT en Galaxy S20+ |
| RF-MOV-004 · identificar en Android la app como Quiniela AI Studio | Implementado v0.1.2 | etiqueta de la app Android; compilación APK de GitHub Actions |

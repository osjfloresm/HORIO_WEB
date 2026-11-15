# Contrato de sincronización Horion Edge ↔ Horion Web

No se recibió el código de Horion Edge. Este contrato y el cliente de ejemplo permiten adaptar su cola SQLite sin suponer acceso al programa de escritorio.

## Autenticación

En Django configura `EDGE_API_KEY` con un secreto aleatorio largo. Edge debe enviarlo en `X-Edge-Key` sobre HTTPS. La clave da acceso a la sincronización de todas las misiones de esta instalación: en despliegues con varios dispositivos debe ampliarse a credenciales por dispositivo/misión. Alternativamente, un administrador puede usar su JWT.

SHA-256 es una **suma de integridad**, no una firma digital ni un sustituto de autenticación. El servidor recalcula la suma, valida datos y registra cada lote una sola vez. Un reintento idéntico devuelve el mismo ID con `created=false`.

## Envío de lote

`POST /api/v1/sync/ingest/`

Primero registra la misión y astronauta en Django Admin. `codigo_astronauta` debe coincidir con la clave de Edge. El cuerpo incluye `payload` y su `hash_sha256`.

```json
{
  "payload": {
    "codigo_astronauta": "HRN-001",
    "registros": [
      {
        "timestamp_utc": "2026-11-14T12:00:00Z",
        "frecuencia_cardiaca": 72,
        "spo2": 98.1,
        "hrv": 48.2,
        "temperatura_corporal": 36.6,
        "horas_sueno": 7.2
      }
    ],
    "alertas": [],
    "orbi": []
  },
  "hash_sha256": "CALCULAR_SOBRE_PAYLOAD"
}
```

Canonicalización exacta para un productor Python/FastAPI:

```python
canonical = json.dumps(payload, sort_keys=True, separators=(',', ':'), ensure_ascii=False)
digest = hashlib.sha256(canonical.encode('utf-8')).hexdigest()
```

La representación numérica forma parte del contrato: para un productor no Python se recomienda serializar los decimales como cadenas (`"98.10"`) y los enteros como enteros. La misma estructura JSON debe producir los mismos bytes canónicos. Django valida y convierte los decimales después de comprobar el hash.

Campos de `alertas`:

- `timestamp_utc`, `nivel_severidad`: `INFO`, `WARNING`, `CRITICAL`.
- `metrica_afectada`, `valor_detectado`, `recomendacion_entregada`.
- `modo_generacion`: `OFFLINE_ALGO` u `ONLINE_GEMINI`.

Campos de `orbi`: `timestamp_utc`, `rol` (`user` u `orbi`), `mensaje`, `contexto_biometrico_json` (objeto JSON). Se conservan privados. La web recibe transcripciones; no ejecuta diagnósticos ni llama a Gemini.

Respuesta 201 al crear, 200 al repetir:

```json
{"id": "UUID_DEL_LOTE", "created": true, "cantidad_registros": 1}
```

Errores: 400 hash incorrecto, valores inválidos, misión desconocida o lecturas anteriores a su inicio; 401/403 credenciales ausentes o no autorizadas. Máximo 10.000 lecturas y 1.000 elementos de alertas/transcripciones por lote. La transacción es atómica: no se guarda una parte de un lote inválido.

## Lectura de actualizaciones

`GET /api/v1/sync/updates/?codigo_astronauta=HRN-001`

Devuelve `protocolos` aprobados para la misión y `lotes_confirmados` con UUID, hash y estado de liberación. Edge puede confirmar su cola local mediante el hash y actualizar su caché de protocolos. Los protocolos en borrador no se sincronizan. Este contrato utiliza pull idempotente; no se incluye push hacia una aplicación de escritorio sin dirección de red/configuración proporcionada.

## Cliente de ejemplo

```bash
cd horion-backend
# Generar ejemplo sin enviar información
venv/bin/python scripts/edge_client.py --astronaut HRN-001

# La clave se lee del entorno (o .env), no se imprime
venv/bin/python scripts/edge_client.py --astronaut HRN-001 --send
```

Para probar una descarga de actualizaciones: `--pull`. El cliente es un ejemplo local; la integración con la cola SQLite de Edge debe usar la misma canonicalización y conservar el payload para reintentos.

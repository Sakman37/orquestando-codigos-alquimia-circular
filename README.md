# Alquimia Circular

Prototipo académico para la Actividad 1 de Arquitectura de Software y la Actividad 2 de Gestión de Innovación y Emprendimiento. La idea es ayudar a pequeños negocios de alimentos a publicar excedentes aptos para consumo, ofrecerlos para recogida con descuento y registrar una derivación a donación.

## Alcance del prototipo

- Panel de ofertas activas y métricas de inventario rescatable.
- Publicación de excedentes con categoría, cantidad, precios y ventana de recogida.
- Reserva de packs con reducción de inventario y confirmación de recogida.
- Registro de derivación a donación con estado pendiente de confirmación del aliado.
- Registro local de eventos de dominio para observar ofertas, reservas, recogidas y donaciones.
- Endpoint de salud y contenedor Docker para despliegue en un servicio compatible con imágenes OCI.

El proyecto usa datos de demostración. No procesa pagos, no autentica usuarios, no verifica aliados ni confirma entregas reales. Los precios, negocios y packs iniciales son ficticios. La persistencia en archivo JSON permite ejecutar el ejemplo sin instalar servicios externos, pero no sirve como base de datos para varias instancias concurrentes.

## Requisitos

- Node.js 20 o superior, sin dependencias de npm para el modo local.
- Docker para ejecutar el contenedor.

## Ejecución local

```bash
npm start
```

Abre `http://localhost:3000`. El primer inicio copia `data/store.seed.json` a `data/store.json`; al reiniciar se conservan los cambios locales.

## Ejecución con Docker

```bash
docker build -t alquimia-circular .
docker run --rm -p 3000:3000 -v alquimia-data:/app/data alquimia-circular
```

En una plataforma administrada, configura `PORT` según el proveedor y monta almacenamiento persistente en `/app/data` si se necesita conservar el archivo. Para producción, sustituye el adaptador JSON por PostgreSQL administrado y usa una cola durable para notificaciones y analítica.

## API de demostración

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/api/health` | Estado de salud |
| GET | `/api/offers` | Ofertas disponibles |
| GET | `/api/reservations` | Reservas pendientes de recogida |
| GET | `/api/summary` | Resumen de packs, reservas y donaciones |
| POST | `/api/offers` | Publicar un excedente |
| POST | `/api/reservations` | Reservar una cantidad disponible |
| PATCH | `/api/reservations/{id}/pickup` | Confirmar recogida |
| POST | `/api/offers/{id}/donate` | Registrar derivación a donación |

## Arquitectura y patrones

El prototipo es un monolito modular. `domain` valida reglas de oferta; `application` coordina casos de uso; `infrastructure` contiene el repositorio JSON y el bus de eventos; `public` entrega la interfaz web. El patrón Repository aísla el almacenamiento; Publisher/Subscriber desacopla la generación de eventos del registro de auditoría. El servidor HTTP sirve como límite de API del prototipo. Para una versión real, el diagrama de despliegue propone gateway administrado, contenedores sin estado, PostgreSQL, cola durable, servicio de identidad y observabilidad.

Los diagramas UML editables se encuentran en `docs/uml/`. La implementación no simula alta disponibilidad ni escalado horizontal: el archivo JSON y el proceso único se reemplazarían antes de un piloto multiusuario.

| Diagrama | Imagen | Fuente editable |
| --- | --- | --- |
| Casos de uso | `docs/uml/casos-de-uso.png` | `docs/uml/casos-de-uso.puml` |
| Clases | `docs/uml/clases.png` | `docs/uml/clases.puml` |
| Secuencia | `docs/uml/secuencia-reserva.png` | `docs/uml/secuencia-reserva.puml` |
| Despliegue cloud | `docs/uml/despliegue-cloud.png` | `docs/uml/despliegue.puml` |

## Estructura

```text
src/
  application/MarketplaceService.js
  domain/Offer.js
  infrastructure/EventBus.js
  infrastructure/JsonStore.js
  server.js
public/
  app.js
  index.html
  styles.css
data/store.seed.json
docs/uml/
```

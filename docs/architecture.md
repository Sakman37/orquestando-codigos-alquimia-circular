# Arquitectura propuesta

## Contexto

Alquimia Circular administra ofertas de excedentes alimentarios de pequeños comercios. El flujo principal va desde que el comercio registra un pack hasta que un cliente lo reserva y el negocio confirma la recogida. Si el negocio decide no venderlo, puede registrar una derivación a una organización aliada. El estado «pendiente de confirmación» distingue el registro digital de una donación efectivamente recibida.

## Decisión

La primera versión usa un monolito modular y una API HTTP. El sistema se divide por responsabilidades, pero se despliega como un solo contenedor. Es una decisión proporcional a un prototipo desarrollado por una persona: mantiene bajo el costo operativo y deja límites claros para separar componentes si el volumen o las necesidades lo justifican.

## Módulos

- Interfaz web: panel del comercio y vitrina de ofertas.
- Casos de uso: publicar excedente, reservar, confirmar recogida y derivar a donación.
- Dominio: validación de cantidades, precios y estados.
- Persistencia: repositorio JSON en el prototipo; PostgreSQL administrado en el objetivo cloud.
- Eventos: bus local para `offer.published`, `reservation.created`, `reservation.picked_up` y `donation.created`; en producción, publicar a una cola durable.
- Operación: endpoint `/api/health`, registros estructurados y métricas en una plataforma administrada.

## Decisiones de calidad

La reserva debe reducir existencias de forma atómica y no permitir cantidades negativas. En el prototipo, el proceso único y la escritura sincrónica reducen la ventana de concurrencia local, pero no garantizan consistencia entre réplicas. La versión productiva debe ejecutar la reserva en una transacción de base de datos y usar una clave idempotente.

El objetivo de disponibilidad inicial es 99,5% mensual; el objetivo de latencia para las operaciones principales es p95 menor o igual a 500 ms bajo una carga piloto acordada. Son metas por comprobar en despliegue, no resultados medidos. El despliegue futuro usa contenedores sin estado, base de datos administrada, copias de seguridad, métricas, registros y alertas. El contenido estático puede servirse desde CDN.

## Alcance y riesgos

La interfaz no ofrece autenticación real, procesamiento de pago, confirmación de una fundación, geolocalización ni predicción automática. No debe utilizarse para gestionar alimentos cuya inocuidad o temperatura no se hayan comprobado por el comercio. Los eventos locales no son una cola durable. Antes de atender usuarios reales se requieren autenticación y autorización por negocio, protección de datos, controles de inocuidad, transacciones, política de retención, monitoreo y pruebas de carga.

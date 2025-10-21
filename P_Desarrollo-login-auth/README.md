# Tablero LED de Básquet – React + Bootstrap

Marcador estilo LED con:
- Equipos con logo y plantilla de jugadores (nombre + número)
- Registro de puntos y faltas por jugador (modal de selección)
- Estadísticas: racha, cambios de liderazgo, ventaja máx., puntos por periodo, sanciones y últimas jugadas
- Paneles colapsables de **Estadísticas** y **Configuración** (tema gris claro)
- Exportación CSV

## Scripts
```bash
npm install
npm run dev
npm run build
npm run preview

## Descripción General

Este proyecto es una aplicación web desarrollada con React, Vite y Bootstrap, diseñada para simular un tablero de puntuación para partidos de baloncesto.
Permite registrar puntos, faltas y sanciones de cada equipo, gestionar jugadores y logos, así como visualizar estadísticas en tiempo real.

---

## Características Principales

•	Interfaz moderna basada en Bootstrap con un diseño limpio y adaptable.
•	Control del tiempo del partido por periodos configurables.
•	Gestión de equipos: nombre, logo y lista de jugadores.
•	Registro de jugadas:
•	Anotaciones (+1, +2, +3 puntos).
•	Faltas personales, técnicas y antideportivas.
•	Selección de jugador responsable para cada acción.
•	Paneles colapsables de:
•	Configuración del partido (duración, equipos, jugadores).
•	Estadísticas (racha activa, ventaja máxima, sanciones, jugadas recientes).
•	Exportación de estadísticas a CSV.


## Estructura del Proyecto

```
P_Desarrollo/
│
├── index.html
├── package.json
├── vite.config.js
├── /public
│   └── imágenes y recursos estáticos
├── /src
│   ├── main.jsx
│   ├── ScoreboardApp.jsx
│   └── /components
│       └── módulos reutilizables
└── /dist
    └── archivos compilados para producción
```

---

## Instalación y Ejecución Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/David-Alvarado92/P_Desarrollo.git
cd P_Desarrollo
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Ejecutar el proyecto

bash
npm run dev


Abra en el navegador la dirección que muestre Vite, por ejemplo:


http://localhost:5173/

## Scripts Disponibles

| Comando           | Descripción                                                    |
| ----------------- | -------------------------------------------------------------- |
| `npm run dev`     | Inicia el servidor de desarrollo con Vite.                     |
| `npm run build`   | Compila la aplicación para producción en `/dist`.              |
| `npm run preview` | Permite previsualizar la compilación de producción localmente. |

---

## Tecnologías Utilizadas

* React 18
* Vite
* Bootstrap 5 y React-Bootstrap
* JavaScript moderno (ES6+)
* LocalStorage
* Hooks de React (`useState`, `useEffect`, `useRef`)

---

## Lógica del Sistema

| Módulo                 | Funcionalidad                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------- |
| ScoreboardApp.jsx      | Controla el estado global del juego: marcador, tiempo, faltas, sanciones.               |
| AnimatedNumber         | Anima los cambios numéricos en el Marcador.                                           |
| TimeDisplay            | Muestra el tiempo restante del periodo.                                               |
| Gestión de equipos     | Permite crear, editar y eliminar equipos con su plantilla de jugadores.               |
| Modal de acciones      | Solicita el jugador antes de registrar puntos o faltas.                               |
| Estadísticas           | Calcula rachas, cambios de liderazgo, ventaja máxima y permite exportar datos en CSV. |

---

## Persistencia de Datos (LocalStorage)

```json
{
  "sb_teams": [
    {
      "id": "timestamp_random",
      "name": "Halcones",
      "logo": "data:image/png;base64,...",
      "players": [
        { "id": "p1", "name": "Carlos López", "number": "10" },
        { "id": "p2", "name": "Luis Ramírez", "number": "5" }
      ]
    }
  ]
}
```

---

## Próximas Mejoras

* Integración de autenticación de usuarios para almacenamiento en la nube.
* Soporte multideporte (fútbol, voleibol, entre otros).
* Sincronización en tiempo real mediante Socket.io.
* Dashboard de estadísticas históricas.

---

## Autor

**Justo David Alvarado Chaclán**
Guatemala
Ingeniero en Sistemas, especializado en desarrollo web y transformación digital.


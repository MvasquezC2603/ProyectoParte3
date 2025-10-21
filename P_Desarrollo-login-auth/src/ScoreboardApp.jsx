import React, { useEffect, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  Button,
  Container,
  Row,
  Col,
  Card,
  Form,
  InputGroup,
  Collapse,
  Table,
  Badge,
  Modal,
  ListGroup,
} from "react-bootstrap";

// =============================
// TABLERO – LED retro + Gestión de Jugadores
// =============================

const pad2 = (n) => String(n).padStart(2, "0");
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const now = () => Date.now();
const fmtTime = (t) => new Date(t).toLocaleTimeString();

const FOUL_LIMIT = 5;
const DEDUP_MS = 90;

const defaultSettings = {
  periodLengthSec: 10 * 60,
  periodsTotal: 4,
  antiDuplicate: false,
};

const defaultState = {
  period: 1,
  clockRunning: false,
  baseGameMs: defaultSettings.periodLengthSec * 1000,
  gameMsLeft: defaultSettings.periodLengthSec * 1000,
  gameStartedAt: null,
  teamA: { id: null, name: "LOCAL", score: 0, fouls: 0, logo: null },
  teamB: { id: null, name: "VISITA", score: 0, fouls: 0, logo: null },
};

const defaultStats = {
  history: [], // {t, team, delta, scoreA, scoreB, period, playerName, playerNumber}
  leadChanges: 0,
  largestLead: 0,
  largestLeadTeam: null,
  perPeriod: {},
  activeRunTeam: null,
  activeRunPoints: 0,
  sanctions: [], // {t, period, team, type, playerName, playerNumber}
};

function TimeDisplay({ ms, className = "" }) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return <span className={`clock-led fw-bold ${className}`}>{pad2(m)}:{pad2(s)}</span>;
}

function AnimatedNumber({ value, className = "" }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const from = fromRef.current;
    const to = value;
    const dur = 200;
    function frame(t) {
      const k = Math.min(1, (t - start) / dur);
      const v = Math.round(from + (to - from) * k);
      setDisplay(v);
      if (k < 1) requestAnimationFrame(frame);
      else fromRef.current = to;
    }
    requestAnimationFrame(frame);
  }, [value]);
  return <span className={`score-led ${className}`}>{display}</span>;
}

const leaderOf = (a, b) => (a === b ? null : a > b ? "A" : "B");

export default function ScoreboardApp() {
  const [settings, setSettings] = useState(defaultSettings);
  const [state, setState] = useState(defaultState);
  const [stats, setStats] = useState(defaultStats);

  // ==== Equipos & Jugadores ====
  const [teams, setTeams] = useState(() => {
    const saved = localStorage.getItem("sb_teams");
    return saved ? JSON.parse(saved) : [];
  });
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamLogo, setNewTeamLogo] = useState(null);
  const [selectedA, setSelectedA] = useState(null);
  const [selectedB, setSelectedB] = useState(null);

  // Gestionar jugadores
  const [manageTeamId, setManageTeamId] = useState(null); // id del equipo a gestionar
  const [playerName, setPlayerName] = useState("");
  const [playerNumber, setPlayerNumber] = useState("");

  // Modal de selección de jugador para acciones en vivo
  const [selectPlayerOpen, setSelectPlayerOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // {teamKey, type:'score'|'foul', points?, foulType?}
  const [selectedPlayerId, setSelectedPlayerId] = useState("");

  // UI
  const [showStats, setShowStats] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  const [draftMinutes, setDraftMinutes] = useState(
    String(Math.round(settings.periodLengthSec / 60))
  );

  useEffect(() => {
    localStorage.setItem("sb_teams", JSON.stringify(teams));
  }, [teams]);

  const rafRef = useRef(null);
  const lastActionRef = useRef({ key: null, t: 0 });
  const shouldLog = (key) => {
    if (!settings.antiDuplicate) return true;
    const t = now();
    if (
      lastActionRef.current.key === key &&
      t - lastActionRef.current.t < DEDUP_MS
    )
      return false;
    lastActionRef.current = { key, t };
    return true;
  };

  // ticker
  useEffect(() => {
    function tick() {
      setState((prev) => {
        let { gameMsLeft, gameStartedAt, clockRunning } = prev;
        const t = now();
        if (clockRunning && gameStartedAt) {
          const elapsed = t - gameStartedAt;
          gameMsLeft = Math.max(0, prev.gameMsLeft - elapsed);
          if (gameMsLeft === 0) clockRunning = false;
        }
        return {
          ...prev,
          gameMsLeft,
          gameStartedAt: clockRunning ? t : null,
          clockRunning,
        };
      });
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // reloj
  const toggleClock = () => {
    setState((prev) => ({
      ...prev,
      clockRunning: !prev.clockRunning,
      gameStartedAt: !prev.clockRunning ? now() : null,
    }));
  };

  const applyTime = () => {
    const mins = clamp(parseInt(draftMinutes || "0", 10) || 0, 1, 60);
    const ms = mins * 60 * 1000;
    setSettings((s) => ({ ...s, periodLengthSec: mins * 60 }));
    setState((prev) => ({
      ...prev,
      baseGameMs: ms,
      gameMsLeft: ms,
      clockRunning: false,
      gameStartedAt: null,
    }));
  };

  const nextPeriod = () => {
    setState((prev) => ({
      ...prev,
      period: Math.min(prev.period + 1, settings.periodsTotal),
      baseGameMs: settings.periodLengthSec * 1000,
      gameMsLeft: settings.periodLengthSec * 1000,
      clockRunning: false,
      gameStartedAt: null,
      teamA: { ...prev.teamA, fouls: 0 },
      teamB: { ...prev.teamB, fouls: 0 },
    }));
  };

  // Helpers rosters
  const getTeamById = (id) => teams.find((t) => t.id === id);
  const getRoster = (teamKey) => {
    const teamId = state[teamKey].id;
    return teamId ? getTeamById(teamId)?.players || [] : [];
  };

  // ==== Acciones con modal de jugador ====
  const openScoreModal = (teamKey, points) => {
    setPendingAction({ teamKey, type: "score", points });
    setSelectedPlayerId("");
    setSelectPlayerOpen(true);
  };

  const openFoulModal = (teamKey, foulType) => {
    setPendingAction({ teamKey, type: "foul", foulType });
    setSelectedPlayerId("");
    setSelectPlayerOpen(true);
  };

  const confirmPlayerAction = () => {
    const { teamKey, type, points, foulType } = pendingAction || {};
    const roster = getRoster(teamKey);
    const player = roster.find((p) => p.id === selectedPlayerId);
    if (!player) return; // obligatorio

    if (type === "score") addScoreCore(teamKey, points, player);
    else if (type === "foul") addFoulCore(teamKey, foulType || "Personal", player);

    setSelectPlayerOpen(false);
    setPendingAction(null);
  };

  // ==== Núcleo de anotaciones (incluye jugador) ====
  const addScoreCore = (teamKey, points, player) => {
    setState((prev) => {
      const scorer = teamKey === "teamA" ? "A" : "B";
      const sig = `score|${scorer}|${points}|${prev.period}`;
      if (!shouldLog(sig)) return prev;

      const newA =
        teamKey === "teamA" ? Math.max(0, prev.teamA.score + points) : prev.teamA.score;
      const newB =
        teamKey === "teamB" ? Math.max(0, prev.teamB.score + points) : prev.teamB.score;

      setStats((s) => {
        const prevLeader = leaderOf(prev.teamA.score, prev.teamB.score);
        const newLeader = leaderOf(newA, newB);
        const leadChanges =
          s.leadChanges + (prevLeader && newLeader && prevLeader !== newLeader ? 1 : 0);
        const margin = Math.abs(newA - newB);
        const largestLead = Math.max(s.largestLead, margin);
        const largestLeadTeam =
          largestLead === margin
            ? newA > newB
              ? "A"
              : newA < newB
                ? "B"
                : s.largestLeadTeam
            : s.largestLeadTeam;

        const pp = { ...s.perPeriod };
        const pkey = String(prev.period);
        if (!pp[pkey]) pp[pkey] = { A: 0, B: 0 };
        if (teamKey === "teamA") pp[pkey].A += points;
        else pp[pkey].B += points;

        let activeRunTeam = s.activeRunTeam;
        let activeRunPoints = s.activeRunPoints;
        if (activeRunTeam === scorer) activeRunPoints += points;
        else {
          activeRunTeam = scorer;
          activeRunPoints = points;
        }

        const history = [
          {
            t: now(),
            team: scorer,
            delta: points,
            scoreA: newA,
            scoreB: newB,
            period: prev.period,
            playerName: player.name,
            playerNumber: player.number,
          },
          ...s.history,
        ].slice(0, 20);

        return {
          ...s,
          history,
          leadChanges,
          largestLead,
          largestLeadTeam,
          perPeriod: pp,
          activeRunTeam,
          activeRunPoints,
        };
      });

      return {
        ...prev,
        teamA: { ...prev.teamA, score: newA },
        teamB: { ...prev.teamB, score: newB },
      };
    });
  };

  const addFoulCore = (teamKey, type = "Personal", player) => {
    setState((prev) => {
      const teamCode = teamKey === "teamA" ? "A" : "B";
      const sig = `foul|${teamCode}|${type}|${prev.period}`;
      if (!shouldLog(sig)) return prev;

      const isA = teamKey === "teamA";
      const tA = { ...prev.teamA };
      const tB = { ...prev.teamB };
      if (type === "Personal") {
        if (isA) tA.fouls = Math.min(FOUL_LIMIT + 5, tA.fouls + 1);
        else tB.fouls = Math.min(FOUL_LIMIT + 5, tB.fouls + 1);
      }
      setStats((s) => ({
        ...s,
        sanctions: [
          {
            t: now(),
            period: prev.period,
            team: teamCode,
            type,
            playerName: player.name,
            playerNumber: player.number,
          },
          ...s.sanctions,
        ].slice(0, 30),
      }));
      return { ...prev, teamA: tA, teamB: tB };
    });
  };

  // 👉 Reset de faltas del periodo
  const resetFouls = () => {
    setState((prev) => ({
      ...prev,
      teamA: { ...prev.teamA, fouls: 0 },
      teamB: { ...prev.teamB, fouls: 0 },
    }));
  };

  // Pequeñas verificaciones en modo dev
  useEffect(() => {
    if (import.meta && import.meta.env && import.meta.env.DEV) {
      console.assert(typeof resetFouls === "function", "resetFouls debe existir");
      console.assert(Array.isArray(teams), "teams debe ser un arreglo");
    }
  }, []);

  // csv
  const downloadCSV = () => {
    const rows = [
      ["timestamp", "period", "team", "delta", "scoreA", "scoreB", "player", "number"],
      ...stats.history.map((h) => [
        fmtTime(h.t),
        h.period,
        h.team,
        h.delta,
        h.scoreA,
        h.scoreB,
        h.playerName || "",
        h.playerNumber || "",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "estadisticas_tablero.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // utils logo
  const readFileAsDataURL = (file) =>
    new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  const onNewTeamLogoChange = async (file) => {
    if (!file) return;
    setNewTeamLogo(await readFileAsDataURL(file));
  };

  const addTeam = () => {
    const name = (newTeamName || "").trim();
    if (!name) return;
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setTeams((arr) => [{ id, name, logo: newTeamLogo || null, players: [] }, ...arr]);
    setNewTeamName("");
    setNewTeamLogo(null);
  };

  const deleteTeam = (id) => setTeams((arr) => arr.filter((t) => t.id !== id));

  // Players CRUD
  const addPlayerToTeam = (teamId) => {
    const n = playerName.trim();
    const num = String(playerNumber).trim();
    if (!n || !num) return;
    setTeams((arr) =>
      arr.map((t) =>
        t.id !== teamId
          ? t
          : {
            ...t,
            players: [
              {
                id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                name: n,
                number: num,
              },
              ...(t.players || []),
            ],
          }
      )
    );
    setPlayerName("");
    setPlayerNumber("");
  };

  const deletePlayer = (teamId, pid) => {
    setTeams((arr) =>
      arr.map((t) =>
        t.id !== teamId ? t : { ...t, players: (t.players || []).filter((p) => p.id !== pid) }
      )
    );
  };

  const applySelectedTeams = () => {
    const teamA = teams.find((t) => t.id === selectedA);
    const teamB = teams.find((t) => t.id === selectedB);
    setState((prev) => ({
      ...prev,
      period: 1,
      teamA: {
        id: teamA?.id || null,
        name: teamA?.name || "LOCAL",
        logo: teamA?.logo || null,
        score: 0,
        fouls: 0,
      },
      teamB: {
        id: teamB?.id || null,
        name: teamB?.name || "VISITA",
        logo: teamB?.logo || null,
        score: 0,
        fouls: 0,
      },
      baseGameMs: settings.periodLengthSec * 1000,
      gameMsLeft: settings.periodLengthSec * 1000,
      clockRunning: false,
      gameStartedAt: null,
    }));
    setStats(defaultStats);
  };

  // ===== UI =====
  return (
    <Container className="py-5 sb">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="m-0 fw-bold text-light display-5" style={{ letterSpacing: ".5px" }}>
          🏀 Tablero LED de Básquet
        </h1>
        <Button
          variant="outline-danger"
          onClick={() => {
            localStorage.removeItem("token");
            window.location.href = "/login";
          }}
        >
          Cerrar sesión
        </Button>

        <div className="d-flex gap-2">
          <Button
            variant={showStats ? "secondary" : "outline-secondary"}
            onClick={() => setShowStats((v) => !v)}
          >
            {showStats ? "Ocultar Estadísticas" : "Estadísticas"}
          </Button>
          <Button
            variant={showConfig ? "warning" : "outline-warning"}
            onClick={() => setShowConfig((v) => !v)}
          >
            {showConfig ? "Ocultar Configuración" : "Configuración"}
          </Button>
        </div>
      </div>

      <Row className="justify-content-center mb-4 g-4">
        {/* LOCAL */}
        <Col md={4}>
          <Card className="p-4 shadow-lg sb-card text-center">
            {state.teamA.logo && (
              <img
                src={state.teamA.logo}
                alt="Logo Local"
                className="mb-2"
                style={{
                  width: 70,
                  height: 70,
                  objectFit: "cover",
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,.2)",
                }}
              />
            )}
            <h2 className="fw-bold label-led mb-2">{state.teamA.name}</h2>
            <div className="mb-2">
              <Badge bg={state.teamA.fouls >= FOUL_LIMIT ? "danger" : "secondary"}>
                FALTAS: {state.teamA.fouls}
                {state.teamA.fouls >= FOUL_LIMIT ? " · BONUS" : ""}
              </Badge>
            </div>
            <div className="mb-3">
              <AnimatedNumber value={state.teamA.score} className="score-red" />
            </div>
            <div className="d-flex justify-content-center gap-2 mb-2">
              <Button variant="outline-success" onClick={() => openScoreModal("teamA", 1)}>
                +1
              </Button>
              <Button variant="outline-primary" onClick={() => openScoreModal("teamA", 2)}>
                +2
              </Button>
              <Button variant="outline-warning" onClick={() => openScoreModal("teamA", 3)}>
                +3
              </Button>
            </div>
            <div className="d-flex justify-content-center gap-2">
              <Button variant="outline-dark" onClick={() => openFoulModal("teamA", "Personal")}>
                Falta +1
              </Button>
              <Button variant="outline-danger" onClick={() => openFoulModal("teamA", "Técnica")}>
                Técnica
              </Button>
              <Button
                variant="outline-warning"
                onClick={() => openFoulModal("teamA", "Antideportiva")}
              >
                Antideportiva
              </Button>
            </div>
          </Card>
        </Col>

        {/* RELOJ */}
        <Col md={4}>
          <Card className="p-4 shadow-lg sb-card text-center">
            <h3 className="fw-bold label-led mb-2">Reloj del Juego</h3>
            <div className="mb-3">
              <TimeDisplay ms={state.gameMsLeft} />
            </div>
            <div className="d-flex justify-content-center gap-2 flex-wrap">
              <Button
                size="lg"
                variant={state.clockRunning ? "danger" : "success"}
                onClick={toggleClock}
              >
                {state.clockRunning ? "Pausar" : "Iniciar"}
              </Button>
              <Button size="lg" variant="outline-dark" onClick={nextPeriod}>
                Siguiente periodo
              </Button>
              <Button size="lg" variant="outline-warning" onClick={resetFouls}>
                Reset faltas período
              </Button>
            </div>
          </Card>
        </Col>

        {/* VISITA */}
        <Col md={4}>
          <Card className="p-4 shadow-lg sb-card text-center">
            {state.teamB.logo && (
              <img
                src={state.teamB.logo}
                alt="Logo Visita"
                className="mb-2"
                style={{
                  width: 70,
                  height: 70,
                  objectFit: "cover",
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,.2)",
                }}
              />
            )}
            <h2 className="fw-bold label-led mb-2">{state.teamB.name}</h2>
            <div className="mb-2">
              <Badge bg={state.teamB.fouls >= FOUL_LIMIT ? "danger" : "secondary"}>
                FALTAS: {state.teamB.fouls}
                {state.teamB.fouls >= FOUL_LIMIT ? " · BONUS" : ""}
              </Badge>
            </div>
            <div className="mb-3">
              <AnimatedNumber value={state.teamB.score} className="score-red" />
            </div>
            <div className="d-flex justify-content-center gap-2 mb-2">
              <Button variant="outline-success" onClick={() => openScoreModal("teamB", 1)}>
                +1
              </Button>
              <Button variant="outline-primary" onClick={() => openScoreModal("teamB", 2)}>
                +2
              </Button>
              <Button variant="outline-warning" onClick={() => openScoreModal("teamB", 3)}>
                +3
              </Button>
            </div>
            <div className="d-flex justify-content-center gap-2">
              <Button variant="outline-dark" onClick={() => openFoulModal("teamB", "Personal")}>
                Falta +1
              </Button>
              <Button variant="outline-danger" onClick={() => openFoulModal("teamB", "Técnica")}>
                Técnica
              </Button>
              <Button
                variant="outline-warning"
                onClick={() => openFoulModal("teamB", "Antideportiva")}
              >
                Antideportiva
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* ====== Estadísticas ====== */}
      <Collapse in={showStats}>
        <div id="stats-panel" className="sb-panel">
          <Row className="mb-4">
            <Col md={10} className="mx-auto">
              <Card className="p-4 shadow sb-card">
                <h4 className="fw-bold label-led mb-3">Estadísticas</h4>
                <Row className="g-3 mb-3">
                  <Col md={3}>
                    <Card className="p-3 text-center sb-card">
                      <div className="small text-secondary text-uppercase">Racha activa</div>
                      <div className="display-6 fw-bold">
                        {stats.activeRunPoints || 0}{" "}
                        <Badge bg="secondary">{stats.activeRunTeam || "-"}</Badge>
                      </div>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="p-3 text-center sb-card">
                      <div className="small text-secondary text-uppercase">Cambios de liderazgo</div>
                      <div className="display-6 fw-bold">{stats.leadChanges}</div>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="p-3 text-center sb-card">
                      <div className="small text-secondary text-uppercase">Ventaja máxima</div>
                      <div className="display-6 fw-bold">{stats.largestLead}</div>
                      <div className="small">Equipo {stats.largestLeadTeam || "-"}</div>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="p-3 text-center sb-card">
                      <div className="small text-secondary text-uppercase">Periodo actual</div>
                      <div className="display-6 fw-bold">{state.period}</div>
                    </Card>
                  </Col>
                </Row>

                <h5 className="text-secondary">Puntos por periodo</h5>
                <Table bordered hover size="sm" className="mb-4 table-light">
                  <thead>
                    <tr>
                      <th>Periodo</th>
                      <th>{state.teamA.name}</th>
                      <th>{state.teamB.name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(stats.perPeriod).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center text-secondary">
                          Sin datos aún
                        </td>
                      </tr>
                    ) : (
                      Object.entries(stats.perPeriod).map(([p, v]) => (
                        <tr key={p}>
                          <td>{p}</td>
                          <td>{v.A}</td>
                          <td>{v.B}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>

                <h5 className="text-secondary">Sanciones</h5>
                <Table bordered size="sm" className="mb-3 table-light">
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Periodo</th>
                      <th>Equipo</th>
                      <th>Jugador</th>
                      <th>Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.sanctions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-secondary">
                          Sin sanciones
                        </td>
                      </tr>
                    ) : (
                      stats.sanctions.map((s, idx) => (
                        <tr key={idx}>
                          <td>{fmtTime(s.t)}</td>
                          <td>{s.period}</td>
                          <td>{s.team}</td>
                          <td>
                            {s.playerNumber ? `#${s.playerNumber} ${s.playerName}` : s.playerName || "-"}
                          </td>
                          <td>{s.type}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>

                <h5 className="text-secondary">Últimas jugadas</h5>
                <Table bordered size="sm" className="table-light">
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Periodo</th>
                      <th>Equipo</th>
                      <th>Jugador</th>
                      <th>Δ Pts</th>
                      <th>Marcador</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.history.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center text-secondary">
                          Aún no hay jugadas
                        </td>
                      </tr>
                    ) : (
                      stats.history.map((h, idx) => (
                        <tr key={idx}>
                          <td>{fmtTime(h.t)}</td>
                          <td>{h.period}</td>
                          <td>{h.team}</td>
                          <td>
                            {h.playerNumber ? `#${h.playerNumber} ${h.playerName}` : h.playerName || "-"}
                          </td>
                          <td>{h.delta}</td>
                          <td>
                            {h.scoreA} - {h.scoreB}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>

                <div className="d-flex justify-content-end">
                  <Button variant="outline-secondary" onClick={downloadCSV}>
                    Descargar CSV
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </Collapse>

      {/* ====== Configuración ====== */}
      <Collapse in={showConfig}>
        <div id="config-panel" className="sb-panel">
          <Row>
            <Col md={10} className="mx-auto">
              <Card className="p-4 shadow sb-card">
                <h4 className="fw-bold label-led mb-3">Configuración del Partido</h4>
                <Form
                  onSubmit={(e) => {
                    e.preventDefault();
                    applyTime();
                  }}
                >
                  <Form.Label className="mb-2 text-secondary">
                    Duración del periodo (minutos)
                  </Form.Label>
                  <InputGroup className="mb-3">
                    <Form.Control
                      type="number"
                      min={1}
                      max={60}
                      value={draftMinutes}
                      onChange={(e) => setDraftMinutes(e.target.value)}
                    />
                    <Button variant="outline-primary" onClick={applyTime}>
                      Aplicar tiempo
                    </Button>
                  </InputGroup>

                  <Form.Check
                    type="switch"
                    id="anti-dup"
                    className="text-secondary mb-4"
                    label="Ignorar dobles clics fantasma (anti-duplicado)"
                    checked={settings.antiDuplicate}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, antiDuplicate: e.target.checked }))
                    }
                  />

                  <h5 className="text-secondary">Gestión de equipos</h5>
                  <Row className="g-3 align-items-end mb-3">
                    <Col md={5}>
                      <Form.Group>
                        <Form.Label className="text-secondary">Nombre del equipo</Form.Label>
                        <Form.Control
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          placeholder="Ej. Halcones"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={5}>
                      <Form.Group>
                        <Form.Label className="text-secondary">Logo (imagen)</Form.Label>
                        <Form.Control
                          type="file"
                          accept="image/*"
                          onChange={(e) => onNewTeamLogoChange(e.target.files?.[0])}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={2} className="d-grid">
                      <Button variant="success" onClick={addTeam}>
                        Agregar
                      </Button>
                    </Col>
                  </Row>

                  {teams.length > 0 && (
                    <div className="mb-3" style={{ maxHeight: 260, overflowY: "auto" }}>
                      <Table size="sm" bordered className="table-light">
                        <thead>
                          <tr>
                            <th style={{ width: 56 }}>Logo</th>
                            <th>Nombre</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teams.map((t) => (
                            <tr key={t.id}>
                              <td>
                                {t.logo ? (
                                  <img
                                    src={t.logo}
                                    alt={t.name}
                                    style={{
                                      width: 40,
                                      height: 40,
                                      objectFit: "cover",
                                      borderRadius: 6,
                                    }}
                                  />
                                ) : (
                                  <span className="text-muted">—</span>
                                )}
                              </td>
                              <td className="align-middle">{t.name}</td>
                              <td className="align-middle">
                                <div className="d-flex flex-wrap gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline-primary"
                                    onClick={() => setSelectedA(t.id)}
                                  >
                                    Local
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline-info"
                                    onClick={() => setSelectedB(t.id)}
                                  >
                                    Visita
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline-secondary"
                                    onClick={() => {
                                      setManageTeamId(t.id);
                                      setPlayerName("");
                                      setPlayerNumber("");
                                    }}
                                  >
                                    Jugadores
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline-danger"
                                    onClick={() => deleteTeam(t.id)}
                                  >
                                    Borrar
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}

                  <Row className="g-3 mb-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="text-secondary">Equipo LOCAL</Form.Label>
                        <Form.Select
                          value={selectedA || ""}
                          onChange={(e) => setSelectedA(e.target.value || null)}
                        >
                          <option value="">— Selecciona equipo —</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="text-secondary">Equipo VISITA</Form.Label>
                        <Form.Select
                          value={selectedB || ""}
                          onChange={(e) => setSelectedB(e.target.value || null)}
                        >
                          <option value="">— Selecciona equipo —</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  <div className="d-flex gap-2">
                    <Button
                      variant="primary"
                      onClick={applySelectedTeams}
                      disabled={!selectedA || !selectedB}
                    >
                      Cargar equipos en el partido
                    </Button>
                    <Button
                      variant="outline-secondary"
                      onClick={() => {
                        setSelectedA(null);
                        setSelectedB(null);
                      }}
                    >
                      Limpiar selección
                    </Button>
                  </div>
                </Form>

                <div className="d-flex gap-2 flex-wrap mt-4">
                  <Button variant="outline-warning" onClick={resetFouls}>
                    Reset faltas período
                  </Button>
                  <Button
                    variant="outline-danger"
                    onClick={() => {
                      setSettings(defaultSettings);
                      setState(defaultState);
                      setStats(defaultStats);
                    }}
                  >
                    Reiniciar Todo
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </Collapse>

      {/* Modal de Gestión de Jugadores */}
      <Modal show={!!manageTeamId} onHide={() => setManageTeamId(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Plantilla – {getTeamById(manageTeamId)?.name || ""}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-2 align-items-end mb-3">
            <Col md={7}>
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Nombre del jugador"
              />
            </Col>
            <Col md={3}>
              <Form.Label>#</Form.Label>
              <Form.Control
                type="number"
                value={playerNumber}
                onChange={(e) => setPlayerNumber(e.target.value)}
                placeholder="00"
              />
            </Col>
            <Col md={2} className="d-grid">
              <Button onClick={() => addPlayerToTeam(manageTeamId)} variant="success">
                Añadir
              </Button>
            </Col>
          </Row>
          <ListGroup variant="flush">
            {(getTeamById(manageTeamId)?.players || []).length === 0 && (
              <div className="text-muted small">Sin jugadores aún.</div>
            )}
            {(getTeamById(manageTeamId)?.players || []).map((p) => (
              <ListGroup.Item
                key={p.id}
                className="d-flex justify-content-between align-items-center"
              >
                <span>
                  <Badge bg="secondary" className="me-2">
                    #{p.number}
                  </Badge>{" "}
                  {p.name}
                </span>
                <Button
                  size="sm"
                  variant="outline-danger"
                  onClick={() => deletePlayer(manageTeamId, p.id)}
                >
                  Eliminar
                </Button>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setManageTeamId(null)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para seleccionar jugador en vivo */}
      <Modal show={selectPlayerOpen} onHide={() => setSelectPlayerOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            Selecciona jugador (
            {pendingAction?.teamKey === "teamA" ? state.teamA.name : state.teamB.name})
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {getRoster(pendingAction?.teamKey || "teamA").length === 0 ? (
            <div className="text-danger">
              Este equipo no tiene jugadores cargados. Ve a Configuración → Jugadores.
            </div>
          ) : (
            <Form.Select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
            >
              <option value="">— Elige jugador —</option>
              {getRoster(pendingAction?.teamKey || "teamA").map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.number} {p.name}
                </option>
              ))}
            </Form.Select>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelectPlayerOpen(false)}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={!selectedPlayerId} onClick={confirmPlayerAction}>
            Confirmar
          </Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        :root{
          --sb-bg:#0b0b0d; --sb-frame:#f2f2f2;
          --led-red:#ff3b30; --led-amber:#ffcc00; --led-green:#3cd267; --led-cyan:#22d3ee;
        }
        body { background: radial-gradient(ellipse at top, #121215, #060608 70%) !important; color:#eaeaea; }

        /* Tarjetas del tablero (negro con marco claro) */
        .sb-card{
          background:#0b0b0d !important;
          border:4px solid var(--sb-frame) !important;
          border-radius:20px !important;
          box-shadow:0 10px 30px rgba(0,0,0,.45) inset, 0 8px 24px rgba(0,0,0,.35);
        }
        .label-led{
          color:#fff; text-transform:uppercase; letter-spacing:2px; text-shadow:0 2px 0 rgba(0,0,0,.5);
        }
        .score-led{
          font-weight:900; font-size:82px; line-height:1; letter-spacing:2px;
          color:var(--led-red);
          text-shadow: 0 0 12px rgba(255,59,48,.55), 0 0 30px rgba(255,59,48,.25);
        }
        .clock-led{
          font-size:64px; color:var(--led-amber);
          text-shadow:0 0 12px rgba(255,204,0,.65), 0 0 30px rgba(255,204,0,.35);
        }

        .badge.bg-secondary{ background:#333 !important; color:#ddd !important; border:1px solid #555; padding:.5rem .65rem; border-radius:10px; }
        .badge.bg-danger{ box-shadow:0 0 8px rgba(255,59,48,.45); padding:.5rem .65rem; border-radius:10px; }

        /* Botones dark del tablero */
        .btn-outline-dark{ color:#e5e5e5; border-color:#555; }
        .btn-outline-dark:hover{ background:#1b1b1f; }
        .btn-outline-warning{ color:var(--led-amber); border-color:var(--led-amber); }
        .btn-outline-warning:hover{ background:rgba(255,204,0,.1); }
        .btn-outline-danger{ color:var(--led-red); border-color:var(--led-red); }
        .btn-outline-danger:hover{ background:rgba(255,59,48,.1); }
        .btn-outline-success{ color:var(--led-green); border-color:var(--led-green); }
        .btn-outline-success:hover{ background:rgba(60,210,103,.08); }
        .btn-outline-primary{ color:var(--led-cyan); border-color:var(--led-cyan); }
        .btn-outline-primary:hover{ background:rgba(34,211,238,.08); }
        .btn-warning{ background:var(--led-amber); border-color:var(--led-amber); color:#111; }
        .btn-secondary{ background:#1e1e22; border-color:#2a2a2e; }

        /* === Paneles desplegados: modo gris claro (Estadísticas/Configuración) === */
        .sb-panel .sb-card{
          background: #f2f2f5 !important;
          border-color: #e6e6ea !important;
          color: #111 !important;
          box-shadow: 0 6px 16px rgba(0,0,0,.08), inset 0 0 0 transparent !important;
        }
        .sb-panel .label-led { color:#222; text-shadow:none; }

        .sb-panel .form-control,
        .sb-panel .form-select{
          background:#ffffff !important;
          color:#111 !important;
          border:1px solid #cfd2d8 !important;
        }
        .sb-panel .form-control:focus,
        .sb-panel .form-select:focus{
          border-color:#7aa2ff !important;
          box-shadow:0 0 0 .15rem rgba(122,162,255,.25) !important;
        }

        .sb-panel .table.table-light{
          background:#ffffff !important;
          color:#222 !important;
          border-color:#e1e4ea !important;
        }
        .sb-panel .table.table-light thead th{
          color:#555 !important;
          border-color:#e1e4ea !important;
        }
        .sb-panel .table.table-light tbody td{
          border-color:#e1e4ea !important;
        }

        .sb-panel .btn-outline-dark{ color:#222; border-color:#666; }
        .sb-panel .btn-outline-dark:hover{ background:#ebedf1; }
        .sb-panel .btn-outline-primary{ color:#0d6efd; border-color:#0d6efd; }
        .sb-panel .btn-outline-primary:hover{ background:rgba(13,110,253,.08); }
        .sb-panel .btn-outline-warning{ color:#b88600; border-color:#ffc107; }
        .sb-panel .btn-outline-warning:hover{ background:rgba(255,193,7,.12); }
        .sb-panel .btn-outline-danger{ color:#c62828; border-color:#ef5350; }
        .sb-panel .btn-outline-danger:hover{ background:rgba(239,83,80,.12); }

        .sb-panel .badge.bg-secondary{
          background:#e9e9ee !important; color:#333 !important; border:1px solid #d7d7de !important;
        }
      `}</style>
    </Container>
  );
}

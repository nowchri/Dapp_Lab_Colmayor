// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LaboratoryAssetRegistry
 * @notice Optimizado para registro individual gestionado por el Backend.
 *         Soporta registro individual y por lotes (batch) en una sola tx.
 */
contract LaboratoryAssetRegistry {
    error OnlyProfessor();
    error OnlyMonitor();
    error AssetAlreadyLoaned(bytes32 assetHash);
    error AssetNotLoaned(bytes32 assetHash);

    address public immutable professor;
    mapping(address => bool) public monitors;

    enum MovementType { Loan, Return }

    struct Movement {
        bytes32 loanHash;      // ID de la bolsa en Postgres (se repite para varios activos)
        bytes32 assetHash;     // ID único del activo (QR)
        bytes32 studentHash;   // ID del estudiante
        address monitor;
        uint64 timestamp;
        MovementType movementType;
    }

    // Estado real de cada activo
    mapping(bytes32 => bool) public assetLoaned;

    Movement[] private movements;

    // Mapeos para trazabilidad individual e historial
    mapping(bytes32 => uint256[]) private byAsset;   // Trazabilidad por equipo (Hoja de vida)
    mapping(bytes32 => uint256[]) private byLoan;    // Agrupar por bolsa de Postgres
    mapping(bytes32 => uint256[]) private byStudent; // Historial del alumno

    uint256 public totalLoans;
    uint256 public totalReturns;

    event MonitorUpdated(address indexed monitor, bool enabled);
    event LoanRegistered(bytes32 indexed assetHash, bytes32 indexed loanHash, bytes32 indexed studentHash);
    event ReturnRegistered(bytes32 indexed assetHash, bytes32 indexed loanHash);

    constructor(address initialMonitor) {
        professor = msg.sender;
        if (initialMonitor != address(0)) {
            monitors[initialMonitor] = true;
            emit MonitorUpdated(initialMonitor, true);
        }
    }

    modifier onlyProfessor() {
        if (msg.sender != professor) revert OnlyProfessor();
        _;
    }

    modifier onlyMonitor() {
        if (!monitors[msg.sender]) revert OnlyMonitor();
        _;
    }

    function setMonitor(address monitor, bool enabled) external onlyProfessor {
        monitors[monitor] = enabled;
        emit MonitorUpdated(monitor, enabled);
    }

    // ─────────────────────────────────────────────────────────
    // Registro de préstamos
    // ─────────────────────────────────────────────────────────

    /** Registra UN activo. */
    function registerLoan(
        bytes32 loanHash,
        bytes32 assetHash,
        bytes32 studentHash
    ) external onlyMonitor {
        _registerLoan(loanHash, assetHash, studentHash);
    }

    /**
     * @notice Registra TODA la bolsa en UNA transacción.
     * Cada activo recibe su propio Movement y evento (trazabilidad individual intacta).
     */
    function registerLoanBatch(
        bytes32 loanHash,
        bytes32[] calldata assetHashes,
        bytes32 studentHash
    ) external onlyMonitor {
        for (uint256 i = 0; i < assetHashes.length; i++) {
            _registerLoan(loanHash, assetHashes[i], studentHash);
        }
    }

    function _registerLoan(
        bytes32 loanHash,
        bytes32 assetHash,
        bytes32 studentHash
    ) internal {
        // 1. Validar que el activo específico NO esté prestado
        if (assetLoaned[assetHash]) revert AssetAlreadyLoaned(assetHash);

        // 2. Crear el registro individual en la "nube" de movimientos
        movements.push(Movement({
            loanHash: loanHash,
            assetHash: assetHash,
            studentHash: studentHash,
            monitor: msg.sender,
            timestamp: uint64(block.timestamp),
            movementType: MovementType.Loan
        }));

        uint256 idx = movements.length - 1;

        // 3. Indexar para que la trazabilidad sea fácil
        byAsset[assetHash].push(idx);   // <--- Esto permite ver la historia de ESTE equipo
        byLoan[loanHash].push(idx);     // <--- Esto permite ver qué otros equipos salieron en la misma bolsa
        byStudent[studentHash].push(idx);

        // 4. Actualizar estado
        assetLoaned[assetHash] = true;
        totalLoans++;

        emit LoanRegistered(assetHash, loanHash, studentHash);
    }

    // ─────────────────────────────────────────────────────────
    // Registro de devoluciones
    // ─────────────────────────────────────────────────────────

    /** Registra la devolución de UN activo. */
    function registerReturn(
        bytes32 loanHash,
        bytes32 assetHash,
        bytes32 studentHash
    ) external onlyMonitor {
        _registerReturn(loanHash, assetHash, studentHash);
    }

    /** Registra la devolución de TODA la bolsa en UNA transacción. */
    function registerReturnBatch(
        bytes32 loanHash,
        bytes32[] calldata assetHashes,
        bytes32 studentHash
    ) external onlyMonitor {
        for (uint256 i = 0; i < assetHashes.length; i++) {
            _registerReturn(loanHash, assetHashes[i], studentHash);
        }
    }

    function _registerReturn(
        bytes32 loanHash,
        bytes32 assetHash,
        bytes32 studentHash
    ) internal {
        if (!assetLoaned[assetHash]) revert AssetNotLoaned(assetHash);

        movements.push(Movement({
            loanHash: loanHash,
            assetHash: assetHash,
            studentHash: studentHash,
            monitor: msg.sender,
            timestamp: uint64(block.timestamp),
            movementType: MovementType.Return
        }));

        uint256 idx = movements.length - 1;
        byAsset[assetHash].push(idx);
        byLoan[loanHash].push(idx);
        byStudent[studentHash].push(idx);

        assetLoaned[assetHash] = false;
        totalReturns++;

        emit ReturnRegistered(assetHash, loanHash);
    }

    // Funciones de consulta para la UI
    function getAssetHistory(bytes32 assetHash) external view returns (uint256[] memory) {
        return byAsset[assetHash];
    }

    function getMovement(uint256 index) external view returns (Movement memory) {
        return movements[index];
    }
}

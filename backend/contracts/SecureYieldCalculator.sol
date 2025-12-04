// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint64, externalEuint32, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title SecureYieldCalculator — Privacy-preserving yield calculator using FHEVM
/// @notice Provides encrypted computation for yield calculations with customizable rates
contract SecureYieldCalculator is ZamaEthereumConfig {
    // Configurable public rate in basis points (bps). Example: 500 = 5.00%
    uint32 public defaultRateBps = 500;

    // Optional per-user custom rate (bps)
    mapping(address => uint32) private _customRateBps;
    mapping(address => bool) private _hasCustomRate;

    // Latest computed encrypted outputs per user
    // These are stored to be retrieved by frontend and decrypted locally
    mapping(address => euint64) private _lastYield; // encrypted yield
    mapping(address => euint64) private _lastTotal;    // encrypted total (principal + yield)

    /// @notice Update global yield rate in basis points (admin/demo purpose). Public plaintext.
    function updateDefaultRate(uint32 newRateBps) external {
        // For demo simplicity; add auth in production
        defaultRateBps = newRateBps;
    }

    /// @notice Set caller's personal yield rate in basis points (overrides global)
    function setCustomRate(uint32 newRateBps) external {
        _customRateBps[msg.sender] = newRateBps;
        _hasCustomRate[msg.sender] = true;
    }

    /// @notice Clear caller's personal yield rate (fallback to global)
    function clearCustomRate() external {
        delete _customRateBps[msg.sender];
        _hasCustomRate[msg.sender] = false;
    }

    /// @notice Calculate yield and total using encrypted principal and time.
    /// @dev Uses the same external encrypted input + inputProof pattern as template.
    /// principal and time are encrypted off-chain and passed as handles; proof is verified by FHE core.
    function calculate(
        externalEuint64 principalEnc,
        externalEuint32 timeEnc,
        bytes calldata inputProof
    ) external {
        // Bring encrypted inputs on-chain
        euint64 principal = FHE.fromExternal(principalEnc, inputProof);
        euint32 time = FHE.fromExternal(timeEnc, inputProof);

        // Select effective rate: personal if set, otherwise global
        uint32 effectiveRate = _hasCustomRate[msg.sender] ? _customRateBps[msg.sender] : defaultRateBps;

        // yield = principal * effectiveRate * time / (10000)
        // Cast to euint64 for safe mul across sizes
        euint64 time64 = FHE.asEuint64(time);
        euint64 rate64 = FHE.asEuint64(FHE.asEuint32(effectiveRate));

        euint64 p_mul_rate = FHE.mul(principal, rate64);
        euint64 p_mul_rate_mul_time = FHE.mul(p_mul_rate, time64);
        euint64 yield = FHE.div(p_mul_rate_mul_time, 10000);

        euint64 total = FHE.add(principal, yield);

        _lastYield[msg.sender] = yield;
        _lastTotal[msg.sender] = total;

        // ACL: allow contract and caller to read their results
        FHE.allowThis(_lastYield[msg.sender]);
        FHE.allowThis(_lastTotal[msg.sender]);
        FHE.allow(_lastYield[msg.sender], msg.sender);
        FHE.allow(_lastTotal[msg.sender], msg.sender);
    }

    /// @notice Returns last encrypted yield handle for caller
    function getLastYield() external view returns (euint64) {
        return _lastYield[msg.sender];
    }

    /// @notice Returns last encrypted total handle for caller
    function getLastTotal() external view returns (euint64) {
        return _lastTotal[msg.sender];
    }

    /// @notice Returns caller's effective rate and whether it is personal
    function getMyRate() external view returns (uint32 rate, bool isCustom) {
        if (_hasCustomRate[msg.sender]) {
            return (_customRateBps[msg.sender], true);
        }
        return (defaultRateBps, false);
    }
}


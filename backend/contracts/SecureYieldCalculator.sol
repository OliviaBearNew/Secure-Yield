// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint64, externalEuint32, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract SecureYieldCalculator is ZamaEthereumConfig {
    uint32 public defaultRateBps = 500;

    mapping(address => euint64) private _lastYield;
    mapping(address => euint64) private _lastTotal;

    function calculate(externalEuint64 principalEnc, externalEuint32 timeEnc, bytes calldata inputProof) external {
        euint64 principal = FHE.fromExternal(principalEnc, inputProof);
        euint32 time = FHE.fromExternal(timeEnc, inputProof);

        euint64 y = FHE.div(FHE.mul(FHE.mul(principal, FHE.asEuint64(FHE.asEuint32(defaultRateBps))), FHE.asEuint64(time)), 10000);
        euint64 t = FHE.add(principal, y);

        _lastYield[msg.sender] = y;
        _lastTotal[msg.sender] = t;

        FHE.allowThis(y);
        FHE.allowThis(t);
        FHE.allow(y, msg.sender);
        FHE.allow(t, msg.sender);
    }

    function getLastYield() external view returns (euint64) { return _lastYield[msg.sender]; }
    function getLastTotal() external view returns (euint64) { return _lastTotal[msg.sender]; }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "./@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-ERC20PermitUpgradeable.sol";
import "./@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract AMAT is Initializable, ERC20Upgradeable, OwnableUpgradeable, ERC20PermitUpgradeable, UUPSUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __ERC20_init("AMAT", "AMAT");
        __Ownable_init();
        __ERC20Permit_init("AMAT");
        __UUPSUpgradeable_init();

        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyOwner
        override
    {}
}

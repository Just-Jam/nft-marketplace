// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

pragma solidity ^0.8.0;

contract SampleToken is ERC20{
    string public _name = "SampleToken";
    string public _symbol = "SAM";

    constructor(uint _amount) ERC20(_name, _symbol){
        _mint(msg.sender, _amount);
    }

    function mint(uint _amount) public {
        _mint(msg.sender, _amount);
    }
}
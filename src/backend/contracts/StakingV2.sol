// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

pragma solidity ^0.8.0;

contract StakingV2 is ReentrancyGuard{
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 public stakingToken;
    uint256 private _totalSupply;

    mapping(address => uint256) private _balances;
    mapping(address => uint256) private _userEthEarned;
    address[] private recipients;

    constructor(address _stakingToken) {
        stakingToken = IERC20(_stakingToken);
    }


    /* ========== VIEWS ========== */

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address _account) external view returns (uint256) {
        return _balances[_account];
    }

    function userEthEarned(address _account) external view returns (uint256) {
        return _userEthEarned[_account];
    }

    /* ========== MUTATIVE FUNCTIONS ========== */
    function stake(uint _amount) external nonReentrant{
        if(_balances[msg.sender] == 0){
            recipients.push(msg.sender);
        }
        stakingToken.transferFrom(msg.sender, address(this), _amount);
        _balances[msg.sender].add(_amount);
        emit Staked(msg.sender, _amount, block.timestamp);
    }

    function withdraw(uint _amount) external nonReentrant{
        _balances[msg.sender].sub(_amount);
        stakingToken.transfer(msg.sender, _amount);
        emit Withdrawn(msg.sender, _amount, block.timestamp);
    }

    function depositEth() external payable{
        for(uint i =0; i < recipients.length; i++){
            _userEthEarned[recipients[i]].add(_balances[recipients[i]].mul(msg.value).div(_totalSupply));
        }
    }

    /* ========== EVENTS ========== */
    event Staked(address _address, uint _amount, uint timestamp);
    event Withdrawn(address _address, uint _amount, uint timestamp);
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

contract AMA is Initializable, OwnableUpgradeable, UUPSUpgradeable {

    struct Question {
        address answerer;
        address questioner;
        uint goal;
        uint funded;
        uint bonus;
        bool answered;
        uint fundAt;
        uint askAt;
        mapping(address => uint) listeners;
        mapping(address => uint) withdrawn;
        mapping(address => uint) stakers;
    }

    mapping(uint => Question) public questions;

    IERC20Upgradeable public token;

    uint public MIN_PRICE_OF_LISTEN;
    uint public TIME_LIMIT_OF_ANSWER;

    mapping(address => uint) public prices;

    event Asked(uint questionId, address questioner, uint amount);
    event Answered(uint questionId, address answerer, uint amount);
    event Listened(uint questionId, address listener, uint amount);
    event Refunded(uint questionId, address refunder, uint amount);
    event Withdrawn(uint questionId, address withdrawer, uint amount);
    event PriceSetted(address answerer, uint amount);
    event Staked(uint questionId, address staker, uint amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(uint listenPrice, uint answerTimeLimit, address tokenAddress) initializer public {
        __Ownable_init();
        __UUPSUpgradeable_init();

        MIN_PRICE_OF_LISTEN = listenPrice;
        TIME_LIMIT_OF_ANSWER = answerTimeLimit;
        token = IERC20Upgradeable(tokenAddress);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyOwner
        override
    {}

    function setToken(address addr) public onlyOwner {
        token = IERC20Upgradeable(addr);
    }

    function setPrice(uint price) external {
        require(price > 0, "The price should be greater than 0");
        prices[msg.sender] = price;

        emit PriceSetted(msg.sender, price);
    }

    function ask(uint questionId, address to, uint amount) external {
        Question storage q = questions[questionId];

        require(prices[to] > 0, "Answerer not ready");
        require(q.fundAt == 0, "Invalid question id");

        q.questioner = msg.sender;
        q.answerer = to;
        q.goal = prices[to];
        q.funded = 0;
        q.fundAt = block.timestamp;

        _stake(questionId, q, amount);
    }

    function stake(uint questionId, uint amount) external {
        Question storage q = questions[questionId];
        require(q.goal > 0, "Invalid question id");
        require(q.goal > q.funded, "Fundraising completed");
        require(block.timestamp < q.fundAt + TIME_LIMIT_OF_ANSWER , "Stake timeout");

        _stake(questionId, q, amount);
    }

    function _stake(uint questionId, Question storage q, uint amount) internal {

        require(q.goal > 0, "Invalid question id");
        require(q.goal > q.funded, "Fundraising completed");

        bool achieved = amount + q.funded >= q.goal;
        uint fund = achieved ? q.goal - q.funded : amount;

        token.transferFrom(msg.sender, address(this), fund);
        q.funded += fund;
        q.stakers[msg.sender] += fund;

        emit Staked(questionId, msg.sender, fund);

        if (achieved) {
            emit Asked(questionId, q.questioner, amount);
            q.askAt = block.timestamp;
        }
    }

    function answer(uint questionId) external {

        Question storage q = questions[questionId];

        require(msg.sender == q.answerer, "Only answerer can answer");
        require(q.goal <= q.funded, "The fundraising has not been reached");
        require(!q.answered, "Already answered");
        require(block.timestamp < q.askAt + TIME_LIMIT_OF_ANSWER , "Timeout");

        q.answered = true;
        uint reward = q.funded;
        token.transfer(msg.sender, reward);

        emit Answered(questionId, msg.sender, reward);
    }

    function refund(uint questionId) external {
        Question storage q = questions[questionId];
        require(q.stakers[msg.sender] > 0, "Not staker");
        require(!q.answered, "Already answered");
        if (q.askAt > 0) {
            require(block.timestamp > q.askAt + TIME_LIMIT_OF_ANSWER , "Please wait util answer timeout");
        } else {
            require(block.timestamp > q.fundAt + TIME_LIMIT_OF_ANSWER , "Please wait util fund timeout");
        }

        uint amount = q.stakers[msg.sender];
        q.stakers[msg.sender] = 0;
        q.funded -= amount;

        token.transfer(msg.sender, amount);

        emit Refunded(questionId, msg.sender, amount);
    }

    function listen(uint questionId, uint amount) external {
        Question storage q = questions[questionId];

        require(q.answered, "Not answered");
        require(amount >= MIN_PRICE_OF_LISTEN, "You should pay for answer");
        require(q.listeners[msg.sender] == 0, "Already paid");

        q.listeners[msg.sender] = amount;
        q.bonus += amount;
        token.transferFrom(msg.sender, address(this), amount);

        emit Listened(questionId, msg.sender, amount);
    }

    function withdraw(uint questionId) external {
        Question storage q = questions[questionId];
        uint staked = q.stakers[msg.sender];
        if (msg.sender == q.answerer) {
            staked = q.funded;
        }
        require(staked > 0, "Not staker");

        uint withdrawn = q.bonus * staked / (q.funded * 2) - q.withdrawn[msg.sender];

        require(withdrawn > 0, "Insufficient balance.");

        q.withdrawn[msg.sender] += withdrawn;

        token.transfer(msg.sender, withdrawn);

        emit Withdrawn(questionId, msg.sender, withdrawn);
    }

}

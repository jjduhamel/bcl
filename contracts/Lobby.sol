// SPDX-License-Identifier: GPL-V3
pragma solidity >=0.4.22 <0.9.0;
import './Challenge.sol';
import './ChessGame.sol';

contract Lobby {
  bool private initialized;
  address public arbiter;

  event CreatedChallenge(address challenge
                       , address indexed player1
                       , address indexed player2);
  event ModifiedChallenge(address indexed challenge
                        , address indexed sender
                        , address indexed receiver);
  event AcceptedChallenge(address indexed challenge
                        , address indexed sender
                        , address indexed receiver);
  event CanceledChallenge(address indexed challenge
                        , address indexed sender
                        , address indexed receiver);
  event GameStarted(address game
                  , address indexed whitePlayer
                  , address indexed blackPlayer);
  event GameFinished(address indexed game
                   , address indexed winner
                   , address indexed loser);
  event GameDisputed(address indexed game
                   , address indexed sender
                   , address indexed receiver);
  event PlayerMoved(address game
                  , address indexed sender
                  , address indexed receiver);

  struct ChallengeMetadata { Challenge.State state; address game; bool exists; }
  struct GameMetadata { ChessGame.State state; address challenge; bool exists; }
  mapping(address => ChallengeMetadata) internal challenges;
  mapping(address => GameMetadata) internal games;

  // Algoz Authentication
  bool public __authEnabled;
  address public __authSigner;
  uint public __authTokenTTL;

  // Admin Stuff
  string public __version;
  bool public __allowChallenges;
  bool public __allowWagers;

  modifier isCurrentChallenge {
    require(challenges[msg.sender].exists, 'ChallengeContractOnly');
    _;
  }

  modifier isCurrentGame {
    require(games[msg.sender].exists, 'GameContractOnly');
    _;
  }

  modifier arbiterOnly() {
    require(msg.sender == arbiter, 'ArbiterOnly');
    _;
  }

  modifier allowChallenge() {
    require(__allowChallenges, 'ChallengingDisabled');
    _;
  }

  modifier allowWager(uint _amount) {
    if (_amount > 0) require(__allowWagers, 'WageringDisabled');
    _;
  }

  function initialize(address _arbiter) public {
    require(!initialized, 'Contract was already initialized');
    arbiter = _arbiter;
    initialized = true;
  }

  function challenge(
    address _player2,
    bool _startAsWhite,
    uint _wagerAmount,
    uint _timePerMove
  ) external payable allowChallenge allowWager(_wagerAmount) {
    require(msg.value >= _wagerAmount, 'InvalidDepositAmount');
    require(_timePerMove >= 60, 'InvalidTimePerMove');
    Challenge _challenge = (new Challenge){ value: msg.value }(
                                            payable(msg.sender)
                                          , payable(_player2)
                                          , _startAsWhite
                                          , _wagerAmount
                                          , _timePerMove);
    challenges[address(_challenge)] = ChallengeMetadata(Challenge.State.Pending
                                                      , address(0)
                                                      , true);
    emit CreatedChallenge(address(_challenge), msg.sender, _player2);
  }

  function updateChallenge(address _sender, address _receiver, Challenge.State _state)
  external isCurrentChallenge {
    address _challenge = msg.sender;
    if (_state == Challenge.State.Pending) {
      emit ModifiedChallenge(_challenge, _sender, _receiver);
    } else if (_state == Challenge.State.Accepted) {
      emit AcceptedChallenge(_challenge, _sender, _receiver);
    } else if (_state == Challenge.State.Canceled
            || _state == Challenge.State.Declined) {
      delete challenges[_challenge];
      emit CanceledChallenge(_challenge, _sender, _receiver);
    }
  }

  function startGame(address _game, address _whitePlayer, address _blackPlayer)
  external isCurrentChallenge {
    address _challenge = msg.sender;
    games[_game] = GameMetadata(ChessGame.State.Started
                            , _challenge
                            , true);
    challenges[_challenge] = ChallengeMetadata(Challenge(_challenge).state()
                                             , _game
                                             , true);
    emit GameStarted(_game, _whitePlayer, _blackPlayer);
  }

  function finishGame(address _winner, address _loser)
  external isCurrentGame {
    address _game = msg.sender;
    address _challenge = games[_game].challenge;
    delete games[_game];
    delete challenges[_challenge];
    emit GameFinished(_game, _winner, _loser);
  }

  function broadcastMove(address _sender, address _receiver)
  external isCurrentGame {
    address _game = msg.sender;
    emit PlayerMoved(_game, _sender, _receiver);
  }

  function disputeGame(address _sender, address _receiver)
  external isCurrentGame {
    address _game = msg.sender;
    emit GameDisputed(_game, _sender, _receiver);
  }

  /*
   * Arbiter functions
   */
  function setVersion(string memory _version)
  external arbiterOnly returns (string memory) {
    __version = _version;
    return __version;
  }

  function setArbiter(address _arbiter)
  external arbiterOnly returns (address) {
    arbiter = _arbiter;
    return arbiter;
  }

  function setAuthData(address _signer, uint _ttl, bool _enabled)
  external arbiterOnly returns (bool) {
    __authEnabled = _enabled;
    __authSigner = _signer;
    __authTokenTTL = _ttl;
    return __authEnabled;
  }

  function allowChallenges(bool _allow)
  external arbiterOnly returns (bool) {
    __allowChallenges = _allow;
    return __allowChallenges;
  }

  function allowWagers(bool _allow)
  external arbiterOnly returns (bool) {
    __allowWagers = _allow;
    return __allowWagers;
  }
}

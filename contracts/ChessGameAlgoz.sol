// SPDX-License-Identifier: GPL-V3
pragma solidity >=0.4.22 <0.9.0;
import './Lobby.sol';
import './ChessGame.sol';
import './lib/Algoz.sol';

contract ChessGameAlgoz is ChessGame, Algoz {
  constructor(address white
            , address black
            , uint movetime)
  ChessGame(white, black, movetime) {
    bool _enabled = Lobby(lobby).__algozEnabled();
    address _signer = Lobby(lobby).__algozSigner();
    uint _ttl = Lobby(lobby).__algozTTL();
    init_algoz(_signer, _ttl, _enabled);
  }

  function move(string memory san
              , bytes1 flags
              , bytes32 algoz_expiry_token
              , bytes32 algoz_auth_token
              , bytes calldata algoz_signature)
  public inProgress currentPlayer timerActive {
    algoz_validate(algoz_expiry_token, algoz_auth_token, algoz_signature);
    super.move(san, flags);
  }

  function move(string memory san, bytes1 flags)
  public view override inProgress currentPlayer timerActive {
    revert('MethodDisabledError');
  }

  function setAlgozSigner(address algoz_signer) external arbiterOnly {
    __algoz_signer = algoz_signer;
    emit ArbiterAction(msg.sender, 'SetAlgozSigner');
  }

  function setAlgozEnabled(bool algoz_enabled) external arbiterOnly {
    __algoz_enabled = algoz_enabled;
    if (algoz_enabled) {
      emit ArbiterAction(msg.sender, 'EnabledAlgoz');
    } else {
      emit ArbiterAction(msg.sender, 'DisabledAlgoz');
    }
  }
}

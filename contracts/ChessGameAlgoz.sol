// SPDX-License-Identifier: GPL-V3
pragma solidity >=0.4.22 <0.9.0;
import './Lobby.sol';
import './ChessGame.sol';
import './lib/Algoz.sol';

contract ChessGameAlgoz is ChessGame, Algoz {
  // FIXME Should check this is being created by the Lobby contract
  constructor(address white
            , address black
            , uint movetime)
  ChessGame(white, black, movetime) {
    // For now just use 10 blocks for expiry
    address algozSigner = Lobby(lobby).algozSigningAddress();
    init_algoz(algozSigner, 10);
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

  function setAlgozSigner(address algoz_signer) external arbiterOnly {
    __algoz_signer = algoz_signer;
    // TODO include signer address in comment
    emit ArbiterAction(msg.sender, 'Set Algoz signer');
  }

  function setAlgozEnabled(bool algoz_enabled) external arbiterOnly {
    __algoz_enabled = algoz_enabled;
    if (algoz_enabled) {
      emit ArbiterAction(msg.sender, 'Enabled Algoz');
    } else {
      emit ArbiterAction(msg.sender, 'Dispabled Algoz');
    }
  }
}

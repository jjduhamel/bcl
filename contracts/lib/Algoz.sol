// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Algoz {
    using ECDSA for bytes32;
    using ECDSA for bytes;
    bool public __algoz_enabled;
    address public __algoz_signer;
    uint public __algoz_ttl;
    uint public __algoz_prev_token;
    bool internal __algoz_initialized;

    function init_algoz(address _signer, uint _ttl, bool _enabled) public {
        require(!__algoz_initialized);
        __algoz_enabled = _enabled;
        __algoz_signer = _signer;
        __algoz_ttl = _ttl;
        __algoz_prev_token = block.number-1;
        __algoz_initialized = true;
    }

    function algoz_validate(bytes32 expiry_token
                          , bytes32 auth_token
                          , bytes calldata signature_token)
    public {
        require(__algoz_initialized);
        if (!__algoz_enabled) return;
        uint256 signed_block_no = uint256(expiry_token);

        // require a higher block number to prevent replay attacks
        require(signed_block_no > __algoz_prev_token, 'AlgozInvalidToken');

        // expire this proof if the current blocknumber > the expiry blocknumber
        if (__algoz_ttl > 0) {
          require(signed_block_no+__algoz_ttl >= block.number
                , 'AlgozExpiredError');
        }

        // check if the signature_token authenticates with algoz public key
        bytes32 hash = abi.encodePacked(expiry_token, auth_token)
                          .toEthSignedMessageHash();
        require(hash.recover(signature_token) == __algoz_signer
              , 'AlgozSignatureError');

        //consumed_token[auth_token] = true;
        __algoz_prev_token = signed_block_no;
    }
}

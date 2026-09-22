// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Smart contract to permanently store personal messages and future targets on the BOT Chain.
contract TimeCapsule {
    
    // Data structure for each capsule
    struct Capsule {
        string message;
        address creator;
        uint256 timestamp;
    }

    // Array to store all created capsules
    Capsule[] private capsules;

    // Event emitted when a new capsule is created
    event CapsuleCreated(
        uint256 indexed id,
        address indexed creator,
        string message,
        uint256 timestamp
    );

    // Adds a new message capsule to the blockchain
    function createCapsule(string calldata _message) external {
        require(bytes(_message).length > 0, "Message cannot be empty");
        require(bytes(_message).length <= 500, "Message too long (max 500 chars)");

        Capsule memory newCapsule = Capsule({
            message: _message,
            creator: msg.sender,
            timestamp: block.timestamp
        });

        capsules.push(newCapsule);
        uint256 newId = capsules.length - 1;

        emit CapsuleCreated(newId, msg.sender, _message, block.timestamp);
    }

    // Returns all stored capsules
    function getAllCapsules() external view returns (Capsule[] memory) {
        return capsules;
    }

    // Returns the total number of stored capsules
    function getCapsulesCount() external view returns (uint256) {
        return capsules.length;
    }

    // Returns capsules created by a specific wallet address
    function getCapsulesByCreator(address _creator) external view returns (Capsule[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < capsules.length; i++) {
            if (capsules[i].creator == _creator) {
                count++;
            }
        }

        Capsule[] memory result = new Capsule[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < capsules.length; i++) {
            if (capsules[i].creator == _creator) {
                result[index] = capsules[i];
                index++;
            }
        }
        return result;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TimeCapsule
 * @dev Smart contract sederhana untuk menyimpan pesan / target pribadi ke BOT Chain Testnet.
 */
contract TimeCapsule {
    
    // Struktur data untuk setiap capsule
    struct Capsule {
        string message;
        address creator;
        uint256 timestamp;
    }

    // Array penyimpan seluruh capsule yang telah dibuat
    Capsule[] private capsules;

    // Event yang dipancarkan saat capsule baru dibuat
    event CapsuleCreated(
        uint256 indexed id,
        address indexed creator,
        string message,
        uint256 timestamp
    );

    /**
     * @dev Menambahkan capsule pesan baru ke dalam blockchain.
     * @param _message Isi pesan atau target pribadi yang ingin disimpan.
     */
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

    /**
     * @dev Mengembalikan seluruh daftar capsule yang tersimpan.
     * @return Array dari struktur Capsule.
     */
    function getAllCapsules() external view returns (Capsule[] memory) {
        return capsules;
    }

    /**
     * @dev Mengembalikan total jumlah capsule yang tersimpan.
     * @return Jumlah total capsule.
     */
    function getCapsulesCount() external view returns (uint256) {
        return capsules.length;
    }

    /**
     * @dev Mengembalikan capsule yang dibuat oleh alamat dompet tertentu.
     * @param _creator Alamat dompet pembuat.
     * @return Array dari struktur Capsule buatan `_creator`.
     */
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

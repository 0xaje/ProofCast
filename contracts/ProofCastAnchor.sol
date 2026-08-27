// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProofCastAnchor
 * @notice Lightweight Somnia on-chain commitment anchor for ProofCast Decision Receipts.
 * @dev Stores SHA-256 evidence hashes, market identifiers, and timestamps without expensive token metadata.
 */
contract ProofCastAnchor {
    struct AnchorRecord {
        bytes32 receiptHash;
        string marketId;
        uint256 timestamp;
        address owner;
    }

    // Mapping from SHA-256 evidence/receipt hash to its on-chain anchor record
    mapping(bytes32 => AnchorRecord) public anchors;

    event ReceiptAnchored(
        bytes32 indexed receiptHash,
        string marketId,
        uint256 timestamp,
        address indexed owner
    );

    error AlreadyAnchored(bytes32 receiptHash);
    error InvalidHash();
    error InvalidMarketId();

    /**
     * @notice Anchors a cryptographic Decision Receipt hash on the Somnia blockchain.
     * @param receiptHash The 32-byte SHA-256 hash representing the Decision Receipt.
     * @param marketId The Somnia DreamDEX market identifier.
     */
    function anchorReceipt(bytes32 receiptHash, string calldata marketId) external {
        if (receiptHash == bytes32(0)) revert InvalidHash();
        if (bytes(marketId).length == 0) revert InvalidMarketId();
        if (anchors[receiptHash].timestamp != 0) revert AlreadyAnchored(receiptHash);

        anchors[receiptHash] = AnchorRecord({
            receiptHash: receiptHash,
            marketId: marketId,
            timestamp: block.timestamp,
            owner: msg.sender
        });

        emit ReceiptAnchored(receiptHash, marketId, block.timestamp, msg.sender);
    }

    /**
     * @notice Verifies whether a given receipt hash has been anchored.
     * @param receiptHash The receipt hash to inspect.
     */
    function verifyAnchor(bytes32 receiptHash) external view returns (
        bool isAnchored,
        string memory marketId,
        uint256 timestamp,
        address owner
    ) {
        AnchorRecord memory record = anchors[receiptHash];
        return (
            record.timestamp > 0,
            record.marketId,
            record.timestamp,
            record.owner
        );
    }
}

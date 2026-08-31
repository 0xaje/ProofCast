// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProofCastAnchor
 * @notice Somnia on-chain commitment anchor, forecaster staking, and reputation verification.
 * @dev Stores SHA-256 evidence hashes, market identifiers, timestamps, $SOM stakes, and reputation tiers.
 */
contract ProofCastAnchor {
    struct AnchorRecord {
        bytes32 receiptHash;
        string marketId;
        uint256 timestamp;
        address owner;
        uint256 stakeAmount; // Staked in native $SOM (in wei)
    }

    struct ForecasterBadge {
        uint8 tier; // 0 = UNRANKED, 1 = BRONZE, 2 = SILVER, 3 = GOLD_MASTER
        uint256 brierScoreBps; // Lower is more accurate (0 - 10000 bps)
        uint256 verifiedCount;
        uint256 updatedAt;
    }

    // Mapping from SHA-256 evidence/receipt hash to its on-chain anchor record
    mapping(bytes32 => AnchorRecord) public anchors;

    // Mapping from forecaster wallet address to their on-chain Soulbound reputation badge
    mapping(address => ForecasterBadge) public badges;

    // Contract admin / owner
    address public admin;

    event ReceiptAnchored(
        bytes32 indexed receiptHash,
        string marketId,
        uint256 timestamp,
        address indexed owner,
        uint256 stakeAmount
    );

    event ForecasterBadgeUpdated(
        address indexed forecaster,
        uint8 tier,
        uint256 brierScoreBps,
        uint256 verifiedCount,
        uint256 timestamp
    );

    error AlreadyAnchored(bytes32 receiptHash);
    error InvalidHash();
    error InvalidMarketId();
    error Unauthorized();

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert Unauthorized();
        _;
    }

    /**
     * @notice Anchors a cryptographic Decision Receipt hash on the Somnia blockchain with optional native $SOM stake.
     * @param receiptHash The 32-byte SHA-256 hash representing the Decision Receipt.
     * @param marketId The Somnia DreamDEX market identifier.
     */
    function anchorReceiptWithStake(bytes32 receiptHash, string calldata marketId) external payable {
        if (receiptHash == bytes32(0)) revert InvalidHash();
        if (bytes(marketId).length == 0) revert InvalidMarketId();
        if (anchors[receiptHash].timestamp != 0) revert AlreadyAnchored(receiptHash);

        anchors[receiptHash] = AnchorRecord({
            receiptHash: receiptHash,
            marketId: marketId,
            timestamp: block.timestamp,
            owner: msg.sender,
            stakeAmount: msg.value
        });

        emit ReceiptAnchored(receiptHash, marketId, block.timestamp, msg.sender, msg.value);
    }

    /**
     * @notice Standard gas-free anchor wrapper (0 stake).
     */
    function anchorReceipt(bytes32 receiptHash, string calldata marketId) external {
        if (receiptHash == bytes32(0)) revert InvalidHash();
        if (bytes(marketId).length == 0) revert InvalidMarketId();
        if (anchors[receiptHash].timestamp != 0) revert AlreadyAnchored(receiptHash);

        anchors[receiptHash] = AnchorRecord({
            receiptHash: receiptHash,
            marketId: marketId,
            timestamp: block.timestamp,
            owner: msg.sender,
            stakeAmount: 0
        });

        emit ReceiptAnchored(receiptHash, marketId, block.timestamp, msg.sender, 0);
    }

    /**
     * @notice Updates a forecaster's on-chain verifiable calibration badge.
     */
    function recordForecasterBadge(
        address forecaster,
        uint8 tier,
        uint256 brierScoreBps,
        uint256 verifiedCount
    ) external onlyAdmin {
        badges[forecaster] = ForecasterBadge({
            tier: tier,
            brierScoreBps: brierScoreBps,
            verifiedCount: verifiedCount,
            updatedAt: block.timestamp
        });

        emit ForecasterBadgeUpdated(forecaster, tier, brierScoreBps, verifiedCount, block.timestamp);
    }

    /**
     * @notice Verifies whether a given receipt hash has been anchored.
     */
    function verifyAnchor(bytes32 receiptHash) external view returns (
        bool isAnchored,
        string memory marketId,
        uint256 timestamp,
        address owner,
        uint256 stakeAmount
    ) {
        AnchorRecord memory record = anchors[receiptHash];
        return (
            record.timestamp > 0,
            record.marketId,
            record.timestamp,
            record.owner,
            record.stakeAmount
        );
    }

    /**
     * @notice Queries a forecaster's Soulbound reputation badge tier and metrics.
     */
    function getForecasterBadge(address forecaster) external view returns (
        uint8 tier,
        uint256 brierScoreBps,
        uint256 verifiedCount,
        uint256 updatedAt
    ) {
        ForecasterBadge memory badge = badges[forecaster];
        return (
            badge.tier,
            badge.brierScoreBps,
            badge.verifiedCount,
            badge.updatedAt
        );
    }
}

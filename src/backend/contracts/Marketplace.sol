//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Marketplace is ReentrancyGuard {

    //State Variables
    //Account that receives fees, immutable: value can only be assigned once
    address payable public immutable feeAccount; 
    //Percent fee on sales
    uint public immutable feePercent;
    uint public itemCount;

    struct Item{
        uint itemId;
        //Stores nft contract
        IERC721 nft;
        uint tokenId;
        uint price;
        address payable seller;
        bool sold;
    }

    event ItemListed(
        uint itemId,
        address indexed nft,
        uint tokenId,
        uint price,
        address indexed seller
    );
    event ItemUnlisted(
        uint itemId,
        address indexed nft,
        uint tokenId,
        address indexed seller
    );

    event ItemPurchased(
        uint itemId,
        address indexed nft,
        uint tokenId,
        uint price,
        address indexed seller,
        address indexed buyer
    );

    //itemId -> Item
    mapping(uint => Item) public items;

    constructor(uint _feePercent){
        feeAccount = payable(msg.sender);
        feePercent = _feePercent;
    } 

    //User passes in address of nft object, tokenId and price for sale
    //nonReentrant prevents reentrancy exploit
    function listItem(IERC721 _nft, uint _tokenId, uint _price) external nonReentrant{
        require(_price > 0, "Price must be greater than 0");
        //increment itemCount
        itemCount++;
        //transfer the nft
        _nft.transferFrom(msg.sender, address(this), _tokenId);
        //adds item to items mapping
        items[itemCount] = Item(itemCount, _nft, _tokenId, _price, payable(msg.sender), false);

        emit ItemListed(
            itemCount, 
            address(_nft), 
            _tokenId, 
            _price, 
            payable(msg.sender)
        );
    }
    //Allows user to unlist nft for sale
    function unlistItem(uint _itemId) external nonReentrant{
        //Fetches item from mapping
        Item storage item = items[_itemId];
        //Checks if item exists 
        require(_itemId > 0 && _itemId <= itemCount, "Item doesn't exist");
        //Checks if item sold
        require(!item.sold, "Item has already been sold");
        //Requires that msg.sender owns the item
        require(item.seller == msg.sender, "You do not own this item");
        //Update item to sold
        item.sold = true;
        //transfer nft to owner
        item.nft.transferFrom(address(this), msg.sender, item.tokenId);
        //emit itemUnlisted event 
        emit ItemUnlisted(
            _itemId,
            address(item.nft),
            item.tokenId,
            msg.sender
        );

    }
    
    function purchaseItem(uint _itemId) external payable nonReentrant {
        uint _totalPrice = getTotalPrice(_itemId);
        //Fetches item from mapping
        Item storage item = items[_itemId];
        //Checks if item exists 
        require(_itemId > 0 && _itemId <= itemCount, "Item doesn't exist");
        require(msg.value >= _totalPrice, "Not enough ETH to cover item price and market fee");
        require(!item.sold, "Item has already been sold");
        //Pays seller and feeAccount
        item.seller.transfer(item.price);
        feeAccount.transfer(_totalPrice - item.price);
        //Update item to sold
        item.sold = true;
        //transfer nft to buyer
        item.nft.transferFrom(address(this), msg.sender, item.tokenId);
        //emit itemPurchased event 
        emit ItemPurchased(
            item.tokenId, 
            address(item.nft), 
            item.tokenId, 
            item.price, 
            item.seller, 
            msg.sender
        );
        
    }

    //Return item price+ fee
    function getTotalPrice(uint _itemId) view public returns(uint){
        return(items[_itemId].price*(100 + feePercent)/100);
    }
}
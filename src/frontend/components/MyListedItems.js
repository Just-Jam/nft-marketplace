import { useEffect, useState } from "react";
import { ethers } from 'ethers'
import { Row, Col, Card} from 'react-bootstrap'

function renderSoldItems(items) {
    return (
        <>
            <h2>Sold</h2>
            <Row xs={1} md={2} lg={4} className="g-4 py-3">
            {items.map((item, idx) => (
                <Col key={idx} className="overflow-hidden">
                <Card>
                    <Card.Img variant="top" src={item.image} />
                    <Card.Footer>
                    For {ethers.utils.formatEther(item.totalPrice)} ETH - Recieved {ethers.utils.formatEther(item.price)} ETH
                    </Card.Footer>
                </Card>
                </Col>
            ))}
            </Row>
        </>
    )
}

export default function MyListedItems({ marketplace, nft, account}) {
    console.log(account)
    const [loading, setLoading] = useState(true)
    const [listedItems, setListedItems] = useState([])
    const [soldItems, setSoldItems] = useState([])

    const loadListedItems = async () =>{
        //Load all sold items that user listed
        const itemCount = await marketplace.itemCount()
        let listedItems = []
        let soldItems = []
        
        //Goes through all items in marketplace
        for (let indx = 1; indx <= itemCount; indx++){
            const i = await marketplace.items(indx)
            //Checks if seller is current account
            if(i.seller.toLowerCase() == account){
                //Get uri url from nft contract
                const uri = await nft.tokenURI(i.tokenId)
                //Use uri to fetch nft metadata stored on ipfs
                const response = await fetch(uri)
                const metadata = await response.json()
                //get total price of item(price+fee)
                const totalPrice = await marketplace.getTotalPrice(i.itemId)

                //Define listed item object 
                let item = {
                    totalPrice,
                    price: i.price,
                    itemId: i.itemId,
                    name: metadata.name,
                    description: metadata.description,
                    image: metadata.image
                }
                listedItems.push(item)
                //Add listed item to sold array if sold
                if (i.sold) soldItems.push(item)
            }
        }
        setLoading(false)
        setListedItems(listedItems)
        setSoldItems(soldItems)
    }
    
    useEffect(() =>{
        loadListedItems()
    },[])

    if (loading) return(
        <main style={{padding:"lrem 0"}}>
            <h2>Loading...</h2>
        </main>
    )

    return(
        <div className="flex justify-center">
            {listedItems.length > 0 ?
                <div className="px-5 py-3 container">
                    <h2>Listed</h2>
                <Row xs={1} md={2} lg={4} className="g-4 py-3">
                    {listedItems.map((item, idx) => (
                    <Col key={idx} className="overflow-hidden">
                        <Card>
                        <Card.Img variant="top" src={item.image} />
                        <Card.Footer>{ethers.utils.formatEther(item.totalPrice)} ETH</Card.Footer>
                        </Card>
                    </Col>
                    ))}
                </Row>
                    {soldItems.length > 0 && renderSoldItems(soldItems)}
                </div>
                : (
                <main style={{ padding: "1rem 0" }}>
                    <h2>No listed assets</h2>
                </main>
            )}
        </div>
    )
}
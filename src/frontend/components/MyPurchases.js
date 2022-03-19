import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Card } from 'react-bootstrap'

export default function MyPurchases({ marketplace, nft, account }) {
    const [loading, setLoading] = useState(true)
    const [purchases, setPurchases] = useState([])
    
    const loadPurchasedItems = async () =>{
        // Fetch purchased items from marketplace by quering Offered events with the buyer set as the user
        const filter =  marketplace.filters.ItemPurchased(null,null,null,null,null,account)
        const results = await marketplace.queryFilter(filter)
        //Fetch metadata of each nft and add to listedItem object, goes through results array
        //Has to perform multiple async, thus promise.all
        const purchases = await Promise.all(results.map(async i =>{
            //Fetch arguments for each result
            i = i.args
            //Get uri url from nft contract
            const uri = await nft.tokenURI(i.tokenId)
            //Use uri to fetch nft metadata stored on ipfs
            const response = await fetch(uri)
            const metadata = await response.json()
            //get total price of item(price+fee)
            const totalPrice = await marketplace.getTotalPrice(i.itemId)

            //Define listed item object
            let purchasedItem = {
                totalPrice,
                price: i.price,
                itemId: i.itemId,
                name: metadata.name,
                description: metadata.description,
                image: metadata.image
            }
            return purchasedItem 
        }))
        setLoading(false)
        setPurchases(purchases)
    }



    useEffect(() => {
      loadPurchasedItems()
    }, [])

    if (loading) return (
      <main style={{ padding: "1rem 0" }}>
        <h2>Loading...</h2>
      </main>
    )

    return (
      <div className="flex justify-center">
        {purchases.length > 0 ?
          <div className="px-5 container">
            <Row xs={1} md={2} lg={4} className="g-4 py-5">
              {purchases.map((item, idx) => (
                <Col key={idx} className="overflow-hidden">
                  <Card>
                    <Card.Img variant="top" src={item.image} />
                    <Card.Footer>{ethers.utils.formatEther(item.totalPrice)} ETH</Card.Footer>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
          : (
            <main style={{ padding: "1rem 0" }}>
              <h2>No purchases</h2>
            </main>
          )}
      </div>
    );
  }
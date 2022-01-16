import * as ethers from "ethers";
import Market from "./market";
// syntactic sugar
import { Bigish } from "./types";

import Mangrove from "./mangrove";

/* Note on big.js:
ethers.js's BigNumber (actually BN.js) only handles integers
big.js handles arbitrary precision decimals, which is what we want
for more on big.js vs decimals.js vs. bignumber.js (which is *not* ethers's BigNumber):
  github.com/MikeMcl/big.js/issues/45#issuecomment-104211175
*/
import Big from "big.js";
import { OfferLogic } from ".";
Big.DP = 20; // precision when dividing
Big.RM = Big.roundHalfUp; // round to nearest

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace LP {
  export type ConstructionParams = {
    mgv: Mangrove;
    logic: OfferLogic;
    market: Market;
  };
  /** Connect to MangroveOffer.
   *  This basic maker contract will relay new/cancel/update
   *  offer order.
   */

  type OptParams = { gasreq?: number; gasprice?: number };

  export type OfferParams =
    | ({ price: Bigish; volume: Bigish } & OptParams)
    | ({ wants: Bigish; gives: Bigish } & OptParams);
}

/**
 * The Maker class connects to a Maker contract.
 * It posts onchain offers.
 *
 * Maker initialization needs to store the network name, so you cannot
 * directly use the constructor. Instead of `new Maker(...)`, do
 *
 * `await Maker.connect(...)`
 */
// Maker.withdrawDeposit()
// Maker.deposit(n)
class LiquidityProvider {
  mgv: Mangrove; // API abstraction of the Mangrove ethers.js contract
  logic: OfferLogic; // API abstraction of the underlying offer logic ethers.js contract
  market: Market; // API market abstraction over Mangrove's offer lists

  constructor(mgv: Mangrove, logic: OfferLogic, market: Market) {
    this.mgv = mgv;
    this.logic = logic;
    this.market = market;
  }

  computeOfferProvision(
    ba: "bids" | "asks",
    opts: { id?: number; gasreq?: number }
  ): Promise<Big> {
    return this.getMissingProvision(ba, opts);
  }

  computeBidProvision(opts: { id?: number; gasreq?: number }): Promise<Big> {
    return this.getMissingProvision("bids", opts);
  }

  computeAskProvision(opts: { id?: number; gasreq?: number }): Promise<Big> {
    return this.getMissingProvision("asks", opts);
  }

  /** List all of the maker's asks */
  asks(): Market.Offer[] {
    return this.market
      .book()
      .asks.filter((ofr) => ofr.maker === this.logic.address);
  }

  /** List all of the maker's bids */
  bids(): Market.Offer[] {
    return this.market
      .book()
      .bids.filter((ofr) => ofr.maker === this.logic.address);
  }

  /**
   *  Given offer params (bids/asks + price info as wants&gives or price&volume),
   *  return {price,wants,gives}
   */
  #normalizeOfferParams(p: { ba: "bids" | "asks" } & LP.OfferParams): {
    price: Big;
    wants: Big;
    gives: Big;
    gasreq?: number;
    gasprice?: number;
  } {
    let wants, gives, price;
    // deduce price from wants&gives, or deduce wants&gives from volume&price
    if ("gives" in p) {
      [wants, gives] = [p.wants, p.gives];
      let [base_amt, quote_amt] = [gives, wants];
      if (p.ba === "bids") {
        [base_amt, quote_amt] = [quote_amt, base_amt];
      }
      price = Big(quote_amt).div(base_amt);
    } else {
      price = p.price;
      [wants, gives] = [Big(p.volume).mul(price), Big(p.volume)];
      if (p.ba === "bids") {
        [wants, gives] = [gives, wants];
      }
    }
    const gasreq = p.gasreq;
    const gasprice = p.gasprice;
    return { wants, gives, price, gasreq, gasprice };
  }

  /** Post a new ask */
  newAsk(
    p: LP.OfferParams,
    overrides: ethers.PayableOverrides = {}
  ): Promise<{ id: number; event: ethers.Event }> {
    return this.newOffer({ ba: "asks", ...p }, overrides);
  }

  /** Post a new bid */
  newBid(
    p: LP.OfferParams,
    overrides: ethers.PayableOverrides = {}
  ): Promise<{ id: number; event: ethers.Event }> {
    return this.newOffer({ ba: "bids", ...p }, overrides);
  }

  /* Create a new offer, let mangrove decide the gasprice. Return a promise fulfilled when mangrove.js has received the tx and updated itself. The tx returns the new offer id.
 
    If the tx created more than one offer, the id of the first one to be written is returned.
  
    Note: we do not return a TransactionResponse because it could be possible to :
     * wait for the response to be mined
     * try to read market.book
     * still get the old book (before new offer is inserted)
    This is due to ethers.js subscription calling the txresponse first and
    updating subscriptions only later.
    To avoid inconsistency we do a market.once(...) which fulfills the promise once the offer has been created.
  */
  async newOffer(
    p: { ba: "bids" | "asks" } & LP.OfferParams,
    overrides: ethers.PayableOverrides = {}
  ): Promise<{ id: number; pivot: number; event: ethers.Event }> {
    const { wants, gives, price, gasreq, gasprice } =
      this.#normalizeOfferParams(p);
    const { outbound_tkn, inbound_tkn } = this.market.getOutboundInbound(p.ba);
    const pivot = this.market.getPivot(p.ba, price);
    const resp = await this.logic.contract.newOffer(
      outbound_tkn.address,
      inbound_tkn.address,
      inbound_tkn.toUnits(wants),
      outbound_tkn.toUnits(gives),
      gasreq ? gasreq : ethers.constants.MaxUint256, // gasreq
      gasprice ? gasprice : 0,
      pivot,
      overrides
    );

    return this.market.once(
      (cbArg, _event, ethersEvent) => ({
        id: cbArg.offer.id,
        event: ethersEvent,
        pivot: pivot,
      }),
      (_cbArg, _event, ethersEvent) => resp.hash === ethersEvent.transactionHash
    );
  }

  /** Update an existing ask */
  updateAsk(
    id: number,
    p: LP.OfferParams,
    overrides: ethers.PayableOverrides = {}
  ): Promise<{ event: ethers.Event }> {
    return this.updateOffer(id, { ba: "asks", ...p }, overrides);
  }

  /** Update an existing offer */
  updateBid(
    id: number,
    p: LP.OfferParams,
    overrides: ethers.PayableOverrides = {}
  ): Promise<{ event: ethers.Event }> {
    return this.updateOffer(id, { ba: "bids", ...p }, overrides);
  }

  /* Update an existing offer. Non-specified parameters will be copied from current
     data in the offer. Reuse current offer's gasprice.
     Input should be {ba:"bids"|"asks"} and price info as wants&gives or as price&volume
     */
  async updateOffer(
    id: number,
    p: { ba: "bids" | "asks" } & LP.OfferParams,
    overrides: ethers.PayableOverrides = {}
  ): Promise<{ event: ethers.Event }> {
    const offerList = p.ba === "asks" ? this.asks() : this.bids();
    const offer = offerList.find((o) => o.id === id);
    if (typeof offer === "undefined") {
      throw Error(
        `No offer in ${p} with id ${id} owned by this maker contract.`
      );
    }

    const { wants, gives, price, gasreq, gasprice } =
      this.#normalizeOfferParams(p);
    const { outbound_tkn, inbound_tkn } = this.market.getOutboundInbound(p.ba);

    const resp = await this.logic.contract.updateOffer(
      outbound_tkn.address,
      inbound_tkn.address,
      inbound_tkn.toUnits(wants),
      outbound_tkn.toUnits(gives),
      gasreq ? gasreq : offer.gasreq,
      gasprice ? gasprice : offer.gasprice,
      this.market.getPivot(p.ba, price),
      id,
      overrides
    );

    return this.market.once(
      (_cbArg, _event, ethersEvent) => ({ event: ethersEvent }),
      (_cbArg, _event, ethersEvent) => resp.hash === ethersEvent.transactionHash
    );
  }

  /** Cancel an ask. If deprovision is true, will return the offer's provision to the maker balance at Mangrove. */
  cancelAsk(
    id: number,
    deprovision = false,
    overrides: ethers.Overrides = {}
  ): Promise<void> {
    return this.cancelOffer("asks", id, deprovision, overrides);
  }

  /** Cancel a bid. If deprovision is true, will return the offer's provision to the maker balance at Mangrove. */
  cancelBid(
    id: number,
    deprovision = false,
    overrides: ethers.Overrides = {}
  ): Promise<void> {
    return this.cancelOffer("bids", id, deprovision, overrides);
  }

  /* Cancel an offer. Return a promise fulfilled when mangrove.js has received the tx and updated itself. If deprovision is true, will return the offer's provision to the maker balance at Mangrove. */
  async cancelOffer(
    ba: "bids" | "asks",
    id: number,
    deprovision = false,
    overrides: ethers.Overrides = {}
  ): Promise<void> {
    const { outbound_tkn, inbound_tkn } = this.market.getOutboundInbound(ba);
    const resp = await this.logic.contract.retractOffer(
      outbound_tkn.address,
      inbound_tkn.address,
      id,
      deprovision,
      overrides
    );

    return this.market.once(
      (/*cbArg, event, ethersEvent*/) => {
        /*empty*/
      },
      (_cbArg, _event, ethersEvent) => resp.hash === ethersEvent.transactionHash
    );
  }

  async getMissingProvision(
    ba: "bids" | "asks",
    opts: { id?: number; gasreq?: number } = {}
  ): Promise<Big> {
    const { outbound_tkn, inbound_tkn } = this.market.getOutboundInbound(ba);
    const prov = await this.logic.contract.getMissingProvision(
      outbound_tkn.address,
      inbound_tkn.address,
      opts.gasreq ? opts.gasreq : ethers.constants.MaxUint256,
      0, //gasprice
      opts.id ? opts.id : 0
    );
    return this.mgv.fromUnits(prov, "ETH");
  }
}

export default LiquidityProvider;

import React from "react";
import BindToChainState from "../Utility/BindToChainState";
import ChainTypes from "../Utility/ChainTypes";
import AmountSelector from "../Utility/AmountSelector";
import Translate from "react-translate-component";
import AssetStore from "../../stores/AssetStore";
import ExchangeInput from "../Exchange/ExchangeInput";
import AssetName from "../Utility/AssetName";
import AssetActions from "../../actions/AssetActions";
import counterpart from "counterpart";
import ApplicationApi from "../../api/ApplicationApi";
import PresaleActions from "../../actions/PresaleActions";
import AccountStore from "../../stores/AccountStore";
import {ChainStore} from "bitsharesjs/es";
import { connect } from "alt-react";
import { Map, List } from "immutable";
import {PropTypes} from "react";

class AccountPresaleCreate extends React.Component {
    static propTypes = {
        asset: ChainTypes.ChainAsset.isRequired,
        assets: PropTypes.object.isRequired,
    }

    constructor(props) {
        super(props);

        //let timezone = new Date().getTimezoneOffset();

        //let start = new Date(new Date().getTime() - timezone * 60000);

        this.state = {
            assets: AssetStore.getState().assets,
            error: null,
            asset_id: "",
            asset: null,
            accept_id: "1.3.0",
            assetsFetched: 0,
            idx: 0,

            amount: "",
            start: new Date().toISOString().substr(0,19),
            stop: new Date().toISOString().substr(0,19),
            mode: 0,
            asset_of_top: "",
            soft_top: 0,
            hard_top: 0,
            asset_of_top_base_price: 0,
            accepts: [],
            unlock_type: 0,
            lock_period: new Date().toISOString().substr(0,19),
            early_bird_part: 0,
            early_bird_pecents: [] // format to object on submit
        };

        //AssetActions.getAssetList.defer(0, 100);
    }

    onAmountChanged({amount, asset}) {
        this.setState({amount: amount, asset});
    }

    onEarlyChanged({amount}) {
        this.setState({early_bird_part: amount});
    }

    onSoftTopChanged({amount, asset}) {
        if (!asset) {
            return;
        }
        this.setState({soft_top: amount * 1});
    }

    onHardTopChanged({amount, asset}) {
        if (!asset) {
            return;
        }
        this.setState({hard_top: amount * 1});
    }

    addAccept() {
        var accepts = this.state.accepts;
        for (var i in accepts) {
            if (accepts[i].asset_id == this.state.accept_id) {
                return;
            }
        }
        accepts.push({
            asset_id: this.state.accept_id,
            symbol: ChainStore.getAsset(this.state.accept_id).get("symbol"),
            base_price: 1,
            amount: 1,
            least: 1,
            most: 1,
        });
        this.setState({accepts: accepts});
    }

    removeAccept(id) {
        var accepts = this.state.accepts;
        for (var i in accepts) {
            if (accepts[i].id == id) {
                accepts.splice(i, 1);
                break;
            }
        }
        this.setState({accepts: accepts});
    }

    supportChange(e) {
        this.setState({accept_id: e.target.value})
    }

    changeAcceptAmount(act, e) {
        this.state.accepts.forEach(accept => {
            if (accept == act) {
                accept.amount = e.target.value;
            }
        });
        this.setState({});
    }

    changeAcceptLeast(act, e) {
        this.state.accepts.forEach(accept => {
            if (accept == act) {
                accept.least = e.target.value;
            }
        });
        this.setState({});
    }

    changeAcceptMost(act, e) {
        this.state.accepts.forEach(accept => {
            if (accept == act) {
                accept.most = e.target.value;
            }
        });
        this.setState({});
    }

    changeUnlockType(e) {
        this.setState({unlock_type: e.target.value});
    }

    onSubmit() {
        let args = {
            issuer: ChainStore.getAccount(AccountStore.getState().currentAccount).get("id"),
            asset_id: this.props.asset.get("id"),
            amount: this.state.amount * Math.pow(10, this.props.asset.get("precision")),
            start: new Date(this.state.start),
            stop: new Date(this.state.stop),
            early_bird_part: this.state.early_bird_part * Math.pow(10, this.props.asset.get("precision")),
            asset_of_top: this.state.asset_of_top,
            soft_top: this.state.soft_top * Math.pow(10, ChainStore.getObject(this.state.asset_of_top).get("precision")),
            hard_top: this.state.hard_top * Math.pow(10, ChainStore.getObject(this.state.asset_of_top).get("precision")),
            lock_period: (new Date(this.state.lock_period).getTime() - new Date(this.state.stop).getTime()) / 1000,
            unlock_type: this.state.unlock_type,
            mode: parseInt(this.state.mode)
        };

        let accepts = [];

        this.state.accepts.forEach(a => {
            accepts.push({
                asset_id: a.asset_id,
                base_price: a.base_price * 1000000000000,
                least: a.least * Math.pow(10, ChainStore.getObject(a.asset_id).get("precision")),
                most: a.most * Math.pow(10, ChainStore.getObject(a.asset_id).get("precision")),
                amount: a.amount * Math.pow(10, this.props.asset.get("precision"))
            });
        });

        args.accepts = accepts;

        var ebps = [];
        this.state.early_bird_pecents.forEach(p => {
            ebps.push({
                time: new Date(p.time),
                percent: p.odd * 10000 /** percentage fields are fixed point with a denominator of 10,000 */
            });
            //let t = new Date(p.time).getTime() / 1000;
            //ebps[t] = p.odd * 1;
            //ebps.push([t, p.odd * 1]);
        });
        args.early_bird_pecents = ebps;
        console.log(args);
        // return;

        PresaleActions.createPresale(args);
    }


    componentWillMount() {
        this._checkAssets(this.props.assets, true);
    }

    _checkAssets(assets, force) {
        let lastAsset = assets.sort((a, b) => {
            if (a.symbol > b.symbol) {
                return 1;
            } else if (a.symbol < b.symbol) {
                return -1;
            } else {
                return 0;
            }
        }).last();

        if (assets.size === 0 || force) {
            AssetActions.getAssetList.defer("A", 100);
            this.setState({assetsFetched: 100});
        } else if (assets.size >= this.state.assetsFetched) {
            AssetActions.getAssetList.defer(lastAsset.symbol, 100);
            this.setState({assetsFetched: this.state.assetsFetched + 99});
        }
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.assets !== this.props.assets) {
            this._checkAssets(nextProps.assets);
        }
    }

    changeBasePrice(act, e) {
        this.state.accepts.forEach(accept => {
            if (accept == act) {
                accept.base_price = e.target.value;
            }
        });
        this.setState({});
    }

    addEarly() {
        let old = this.state.early_bird_pecents;
        old.push({
            time: new Date().toISOString().substr(0,19),
            odd: 1
        });
        this.setState({early_bird_pecents: old});
    }

    removeEarly(id) {
        var earlys = this.state.early_bird_pecents;
        for (var i in earlys) {
            if (earlys[i] == id) {
                earlys.splice(i, 1);
                break;
            }
        }
        this.setState({early_bird_pecents: earlys});
    }

    onChangeEarlyTime(idx, e) {
        let old = this.state.early_bird_pecents;
        for (var i in old) {
            if (old[i] == idx) {
                old[i].time = e.target.value;
                break;
            }
        }
        //this.setState({early_bird_pecents: old});
    }

    onChangeEarlyOdd(idx, e) {
        let old = this.state.early_bird_pecents;
        for (var i in old) {
            if (old[i] == idx) {
                old[i].odd = e.target.value;
                break;
            }
        }
        this.setState({early_bird_pecents: old});
    }

    onCancle() {
        this.props.router.push(`/account/${this.props.account_name}/assets`);
    }

    changeAOTBasePrice(e) {
        let {accepts} = this.state;
        accepts[0].base_price = e.target.value;
        this.setState({accepts});
    }

    renderAccepts() {
        let accepts_part = this.state.accepts.map(accept => {
            return (
                <tr key={accept.asset_id}>
                    <td>{accept.symbol}</td>
                    <td>

                        <div className="grid-block buy-sell-row" style={{margin: 0}}>
                            <div className="grid-block no-margin no-overflow buy-sell-input" style={{width: "50px"}}>
                                <ExchangeInput value={accept.amount} onChange={this.changeAcceptAmount.bind(this, accept)} autoComplete="off" placeholder="0" />
                            </div>
                            <div className="grid-block no-margin no-overflow buy-sell-box" style={{width: "20px"}}>
                                <AssetName dataPlace="right" name={this.props.asset.get("symbol")} />
                            </div>
                        </div>
                    </td>
                    <td>
                        <div className="grid-block no-padding buy-sell-row" style={{margin: 0}}>
                            <div className="grid-block no-margin no-overflow buy-sell-input" style={{width: "40px"}}>
                                <ExchangeInput value={accept.base_price} onChange={this.changeBasePrice.bind(this, accept)} autoComplete="off" placeholder="0.0" />
                            </div>
                            <div className="grid-block no-margin no-overflow buy-sell-box">
                                <AssetName dataPlace="right" name={accept.symbol} />
                                &nbsp;/&nbsp;
                                <AssetName dataPlace="right" name={this.props.asset.get("symbol")} />
                            </div>
                        </div>
                    </td>
                    <td>
                        <div className="grid-block no-padding buy-sell-row" style={{margin: 0}}>
                            <div className="grid-block no-margin no-overflow buy-sell-input" style={{width: "40px"}}>
                                <ExchangeInput value={accept.least} onChange={this.changeAcceptLeast.bind(this, accept)} placeholder="0" />
                            </div>
                            <div className="grid-block no-margin no-overflow buy-sell-box" style={{width: "20px"}}>
                                <AssetName dataPlace="right" name={accept.symbol} />
                            </div>
                        </div>
                    </td>
                    <td>
                        <div className="grid-block no-padding buy-sell-row" style={{margin: 0}}>
                            <div className="grid-block no-margin no-overflow buy-sell-input" style={{width: "40px"}}>
                                <ExchangeInput value={accept.most} onChange={this.changeAcceptMost.bind(this, accept)} placeholder="0" />
                            </div>
                            <div className="grid-block no-margin no-overflow buy-sell-box" style={{width: "20px"}}>
                                <AssetName dataPlace="right" name={accept.symbol} />
                            </div>
                        </div>
                    </td>
                    <td><button className="button outline" onClick={this.removeAccept.bind(this, accept.id)}><Translate content="presale.delete"/></button></td>
                </tr>
            );
        });
        return accepts_part;
    }

    _renderAssetOfTop() {
        let asset_id = this.state.accepts.length === 1 ? this.state.accepts[0].asset_id : this.props.asset.get("id");
        this.state.asset_of_top = asset_id;
        return (
            <table className="table">
                <thead>
                <th><Translate content="presale.mintotal"/></th>
                <th><Translate content="presale.maxtotal"/></th>
                </thead>
                <tbody>
                <tr>
                    <td>
                        <AmountSelector
                            style={{width: "100%"}}
                            amount={this.state.soft_top}
                            onChange={this.onSoftTopChanged.bind(this)}
                            asset={asset_id}
                            assets={[asset_id]}
                            placeholder="0.00"
                        />
                    </td>
                    <td>
                        <AmountSelector
                            amount={this.state.hard_top}
                            onChange={this.onHardTopChanged.bind(this)}
                            asset={asset_id}
                            assets={[asset_id]}
                            placeholder="0.00"
                        />
                    </td>
                </tr>
                </tbody>
            </table>
        );
    }

    render() {

        let supports = this.props.assets.filter(ast => {
            return ast.id != this.props.asset.get("id");
        }).map(ast => {
            return <option key={ast.id} value={ast.id}>{ast.symbol}</option>
        })


        let unlock_type_options = [
            <option key={0} value="0"><Translate content="presale.lockmode_liner"/></option>,
            <option key={1} value="1"><Translate content="presale.lockmode_deadline"/></option>
        ];

        let early_bird_percents_sec = [];
        this.state.early_bird_pecents.forEach(p => {
            var node = (
                <tr key={p.time}>
                    <td><input value={p.time} onChange={this.onChangeEarlyTime.bind(this, p)} type="datetime-local" step={1}/></td>
                    <td><input value={p.odd} type="text" onChange={this.onChangeEarlyOdd.bind(this, p)}/></td>
                    <td><button className="button outline" onClick={this.removeEarly.bind(this, p)}><Translate content="presale.delete"/></button></td>
                </tr>
            );
            early_bird_percents_sec.push(node);
        });

        return (
            <div className="grid-block" style={{paddingTop: "30px"}}>
                <div className="grid-content large-12 small-12">
                    <Translate content="presale.create" component="h3" />
                    <AmountSelector
                        label="presale.amount"
                        amount={this.state.amount}
                        onChange={this.onAmountChanged.bind(this)}
                        asset={this.props.asset.get("id")}
                        assets={[this.props.asset.get("id")]}
                        style={{marginBottom: "20px", width: "50%"}}
                    />
                    <label style={{width: "50%", paddingRight: "2.5%", display: "inline-block"}}>
                        <label>
                            <Translate content="account.votes.start" />
                            <input value={this.state.start} onChange={(e) => {this.setState({start: e.target.value});console.log(e.target.value)}} type="datetime-local" step={1}></input>
                        </label>
                    </label>
                    <label style={{width: "50%", paddingLeft: "2.5%", display: "inline-block"}}>
                        <label>
                            <Translate content="account.votes.end" />
                            <input value={this.state.stop} onChange={(e) => {this.setState({stop: e.target.value});}} type="datetime-local" step={1}></input>
                        </label>
                    </label>

                    <div>
                        <Translate content="presale.mode.title"/>
                        <div></div>
                        <label style={{display: "inline-block", marginRight: "30px"}}>
                            <input type="radio" name="mode"
                                   value="0"
                                   checked={this.state.mode == 0}
                                   onChange={e => {this.setState({mode: e.currentTarget.value, accepts: []})}} /><Translate content="presale.mode.per"/>
                        </label>
                        <label style={{display: "inline-block"}}>
                            <input type="radio" name="mode"
                                   value="1"
                                   checked={this.state.mode == 1}
                                   onChange={e => {this.setState({mode: e.currentTarget.value, accepts: []})}} /><Translate content="presale.mode.total"/>
                        </label>
                    </div>

                    <div>
                        <select style={{width: "30%", display: "inline-block", marginRight: "30px", height: "40px"}} value={this.state.accept_id} onChange={this.supportChange.bind(this)}>
                            {supports}
                        </select>
                        <button className="button outline" style={{display: "inline-block"}} onClick={this.addAccept.bind(this)}><Translate content="presale.add_accept"/></button>
                        {this.state.accepts.length ?
                            <table className="table">
                                <thead>
                                <tr>
                                    <th><Translate content="explorer.assets.title"/></th>
                                    <th><Translate content="presale.total"/></th>
                                    <th><Translate content="presale.perprice"/></th>
                                    <th><Translate content="presale.minbuy"/></th>
                                    <th><Translate content="presale.maxbuy"/></th>
                                    <th></th>
                                </tr>
                                </thead>
                                <tbody>
                                {this.renderAccepts()}
                                </tbody>
                            </table>
                            :
                            null
                        }
                    </div>

                    {this._renderAssetOfTop()}

                    <label style={{width: "50%"}}>
                        <Translate content="presale.lock_period"/>
                        <input value={this.state.lock_period} onChange={e => {this.setState({lock_period: e.target.value})}} type="datetime-local" step={1}/>
                    </label>

                    <label style={{marginTop: "20px"}}>
                        <AmountSelector
                            label="presale.early_bird"
                            amount={this.state.early_bird_part}
                            onChange={this.onEarlyChanged.bind(this)}
                            asset={this.props.asset.get("id")}
                            assets={[this.props.asset.get("id")]}
                            style={{marginBottom: "20px", width: "50%"}}
                        />
                        <button className="button outline" onClick={this.addEarly.bind(this)}>添加阶段</button>
                    </label>
                    {Object.keys(this.state.early_bird_pecents).length ?
                        <table className="table">
                            <thead>
                            <tr>
                                <th><Translate content="explorer.block.time"/></th>
                                <th><Translate content="presale.odd"/></th>
                                <th></th>
                            </tr>
                            </thead>
                            <tbody>
                            {early_bird_percents_sec}
                            </tbody>
                        </table>
                        :
                        null
                    }
                    <label style={{marginTop: "20px"}}>
                        <Translate content="presale.lockmode"/>
                        <select
                            onChange={this.changeUnlockType.bind(this)}
                            className="bts-select"
                            value={this.state.unlock_type}
                        >
                            {unlock_type_options}
                        </select>
                    </label>
                    <div className="button-group">
                        <div className="button" type="submit" onClick={this.onSubmit.bind(this)}><Translate content="presale.create"/></div>
                        <div className="button outline" onClick={this.onCancle.bind(this)}><Translate content="presale.cancle"/></div>
                    </div>
                </div>
            </div>
        );
    }
}

AccountPresaleCreate = BindToChainState(AccountPresaleCreate);

export default connect(AccountPresaleCreate, {
    listenTo() {
        return [AssetStore];
    },
    getProps(props) {
        let assets = Map();

        assets = AssetStore.getState().assets;
        return {assets, asset: props.params.asset};
    }
});
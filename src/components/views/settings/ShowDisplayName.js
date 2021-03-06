/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';
const React = require('react');
const sdk = require('../../../index');
const MatrixClientPeg = require("../../../MatrixClientPeg");
import { _t } from '../../../languageHandler';

module.exports = React.createClass({
    displayName: 'ShowDisplayName',

    _getDisplayName: function() {
        const cli = MatrixClientPeg.get();
        return cli.getProfileInfo(cli.credentials.userId).then(function(result) {
            let displayname = result.displayname;
            if (!displayname) {
                if (MatrixClientPeg.get().isGuest()) {
                    displayname = "Guest " + MatrixClientPeg.get().getUserIdLocalpart();
                } else {
                    displayname = MatrixClientPeg.get().getUserIdLocalpart();
                }
            }
            return displayname;
        }, function(error) {
            throw new Error("Failed to fetch display name");
        });
    },

    render: function() {
        const EditableTextContainer = sdk.getComponent('elements.EditableTextContainer');
        return (
            <EditableTextContainer
                getInitialValue={this._getDisplayName}
                placeholder={_t("No display name")}
                editable={false}
            />
        );
    },
});

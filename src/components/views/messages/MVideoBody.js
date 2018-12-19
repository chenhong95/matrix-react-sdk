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

import React from 'react';
import PropTypes from 'prop-types';
import MFileBody from './MFileBody';
import Promise from 'bluebird';
import { _t } from '../../../languageHandler';
import SettingsStore from "../../../settings/SettingsStore";
import {downloadContent, downloadContentEncrypted, scanContent} from "../../../utils/ContentScanner";

module.exports = React.createClass({
    displayName: 'MVideoBody',

    propTypes: {
        /* the MatrixEvent to show */
        mxEvent: PropTypes.object.isRequired,

        /* called when the video has loaded */
        onWidgetLoad: PropTypes.func.isRequired,
    },

    getInitialState: function() {
        return {
            decryptedUrl: null,
            decryptedThumbnailUrl: null,
            decryptedBlob: null,
            error: null,
            isClean: null,
            contentUrl: null
        };
    },

    thumbScale: function(fullWidth, fullHeight, thumbWidth, thumbHeight) {
        if (!fullWidth || !fullHeight) {
            // Cannot calculate thumbnail height for image: missing w/h in metadata. We can't even
            // log this because it's spammy
            return undefined;
        }
        if (fullWidth < thumbWidth && fullHeight < thumbHeight) {
            // no scaling needs to be applied
            return 1;
        }
        const widthMulti = thumbWidth / fullWidth;
        const heightMulti = thumbHeight / fullHeight;
        if (widthMulti < heightMulti) {
            // width is the dominant dimension so scaling will be fixed on that
            return widthMulti;
        } else {
            // height is the dominant dimension so scaling will be fixed on that
            return heightMulti;
        }
    },

    _getContentUrl() {
        const content = this.props.mxEvent.getContent();
        if (content.file !== undefined) {
            return this.state.decryptedUrl;
        } else {
            return this.state.contentUrl;
        }
    },

    _getThumbUrl: function() {
        const content = this.props.mxEvent.getContent();
        if (content.file !== undefined) {
            return this.state.decryptedThumbnailUrl;
        } else if (content.info && content.info.thumbnail_url) {
            return downloadContent(content, true);
        } else {
            return null;
        }
    },

    componentDidMount: function() {
        const content = this.props.mxEvent.getContent();
        if (content.file !== undefined && this.state.decryptedUrl === null) {
            scanContent(content).then(result => {
                if (result.clean === true) {
                    this.setState({
                        isClean: true,
                    });
                    let thumbnailPromise = Promise.resolve(null);
                    if (content.info && content.info.thumbnail_file) {
                        thumbnailPromise = downloadContentEncrypted(
                            content, true
                        ).then(function(blob) {
                            return URL.createObjectURL(blob);
                        });
                    }
                    let decryptedBlob;
                    thumbnailPromise.then((thumbnailUrl) => {
                        return Promise.resolve(downloadContentEncrypted(content)).then(function(blob) {
                            decryptedBlob = blob;
                            return URL.createObjectURL(blob);
                        }).then((contentUrl) => {
                            this.setState({
                                decryptedUrl: contentUrl,
                                decryptedThumbnailUrl: thumbnailUrl,
                                decryptedBlob: decryptedBlob,
                            });
                        });
                    }).catch((err) => {
                        console.warn("Unable to decrypt attachment: ", err);
                        // Set a placeholder image when we can't decrypt the image.
                        this.setState({
                            error: err,
                        });
                    }).done();
                } else {
                    this.setState({
                        isClean: false,
                    });
                }
            });
        } else if (content.url !== undefined) {
            scanContent(content).then(result => {
                if (result.clean === true) {
                    this.setState({
                        contentUrl: downloadContent(content),
                        isClean: true,
                    })
                } else {
                    this.setState({
                        isClean: false,
                    })
                }
            });
        }
    },

    componentWillUnmount: function() {
        if (this.state.decryptedUrl) {
            URL.revokeObjectURL(this.state.decryptedUrl);
        }
        if (this.state.decryptedThumbnailUrl) {
            URL.revokeObjectURL(this.state.decryptedThumbnailUrl);
        }
    },

    render: function() {
        const content = this.props.mxEvent.getContent();

        if (this.state.error !== null) {
            return (
                <span className="mx_MVideoBody" ref="body">
                    <img src="img/warning.svg" width="16" height="16" />
                    { _t("Error decrypting video") }
                </span>
            );
        }

        if (content.file !== undefined && this.state.decryptedUrl === null) {
            // Need to decrypt the attachment
            // The attachment is decrypted in componentDidMount.
            // For now add an img tag with a spinner.
            return (
                <span className="mx_MVideoBody" ref="body">
                    <div className="mx_MImageBody_thumbnail mx_MImageBody_thumbnail_spinner" ref="image">
                        <img src="img/spinner.gif" alt={content.body} width="16" height="16" />
                    </div>
                </span>
            );
        }

        const contentUrl = this._getContentUrl();
        const thumbUrl = this._getThumbUrl();
        const autoplay = SettingsStore.getValue("autoplayGifsAndVideos");
        let height = null;
        let width = null;
        let poster = null;
        let preload = "metadata";
        if (content.info) {
            const scale = this.thumbScale(content.info.w, content.info.h, 480, 360);
            if (scale) {
                width = Math.floor(content.info.w * scale);
                height = Math.floor(content.info.h * scale);
            }

            if (thumbUrl) {
                poster = thumbUrl;
                preload = "none";
            }
        }
        return (
            <span className="mx_MVideoBody">
                <video className="mx_MVideoBody" src={contentUrl} alt={content.body}
                    controls preload={preload} muted={autoplay} autoPlay={autoplay}
                    height={height} width={width} poster={poster}>
                </video>
                <MFileBody {...this.props} decryptedBlob={this.state.decryptedBlob} />
            </span>
        );
    },
});

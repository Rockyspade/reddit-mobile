import React from 'react';
import moment from 'moment';

import short from '../../lib/formatDifference';
import mobilify from '../../lib/mobilify';

import VoteFactory from '../components/Vote';
var Vote;

import ListingDropdownFactory from '../components/ListingDropdown';
var ListingDropdown;

import PlayIconFactory from '../components/icons/PlayIcon';
var PlayIcon;

var imgMatch = /\.(?:gif|jpe?g|png)/gi;
var gifMatch = /\.(?:gif)/gi;
var gfyRegex = /https?:\/\/(?:.+)\.gfycat.com\/(.+)\.gif/;

function isImgurDomain(domain) {
  return (domain || '').indexOf('imgur.com') >= 0;
}

function gifToHTML5(url, config) {
  if (!url) {
    return;
  }

  if (url.indexOf('.gif') < 1) {
    return;
  }

  // If it's imgur, make a gifv link
  if (url.indexOf('imgur.com') > -1) {
    url = adjustUrlToAppProtocol(url, config);
    return {
      webm: url.replace(/\.gif/, '.webm'),
      mp4: url.replace(/\.gif/, '.mp4'),
      poster: url.replace(/\.gif/, 'h.jpg'),
    };
  } else if (url.indexOf('gfycat') > 8) {
    var gfy = gfyRegex.exec(url);

    if (gfy.length === 2) {
      var id = gfy[1];
      return {
        iframe: (config.https || config.httpsProxy ? 'https://' : 'http://') + 'gfycat.com/ifr/' + id,
      };
    }
  }
}

function adjustUrlToAppProtocol(url, config) {
  if (config && url) {
    if (config.https || config.httpsProxy) {
      return url.replace('http://', 'https://');
    } else {
      return url.replace('https://', 'http://');
    }
  }
  return url;
}

class Listing extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      expanded: this.props.expanded,
    };

    if (typeof window !== 'undefined') {
      var width = (
        window.innerWidth ||
        document.documentElement.clientWidth ||
        document.body.clientWidth
      );

      this.state.windowWidth = width;
    } else {
      this.state.windowWidth = 800;
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return (nextProps !== this.props || nextState !== this.state);
  }

  buildImage(data) {
    var expanded = this.state.expanded || this.props.single;
    var ctx = this;

    var html5 = gifToHTML5(data.url, {
      https: ctx.props.https,
      httpsProxy: ctx.props.httpsProxy,
    });


    if (expanded) {
      if (html5) {
        var height = data.embed ? data.embed.height : 300;

        if (html5.iframe) {
          return (
            <div className='ratio16x9'>
              <iframe src={ html5.iframe } frameBorder='0' width='100%' allowFullScreen='' height={ height }
                sandbox='allow-scripts allow-forms allow-same-origin'
                onError={ ctx.handleIFrameError.bind(ctx, data.fallbackUrl) }></iframe>
            </div>
          );
        } else {
          return (
            <div className='ratio16x9'>
              <video poster={ html5.poster } height={ height } width='100%' loop='true' muted='true' controls='true' autoPlay='true'>
                <source type='video/webm' src={ html5.webm } />
                <source type='video/mp4' src={ html5.mp4 } />
              </video>
            </div>
          );
        }
      } else if (data.fixedRatio) {
        return (
          <div className='ratio16x9'>
            <div className='ratio16x9-child' style={ {backgroundImage: 'url('+data.url+')'} }>
              <PlayIcon/>
            </div>
          </div>
        );
      }
    }

    if (html5 && html5.poster) {
      return (
        <div className='ratio16x9'>
          <div className='ratio16x9-child' style={ {backgroundImage: 'url('+html5.poster+')'} }>
            <PlayIcon/>
          </div>
        </div>
      );
    }

    if (data.isVideo) {
      return (
        <div className='ratio16x9'>
          <div className='ratio16x9-child' style={ {backgroundImage: 'url('+data.url+')'} }>
            <PlayIcon/>
          </div>
        </div>
      );
    }

    return (
      <img ref='img' src={ data.url } className='img-responsive img-preview'
        onError={ ctx.handleImageError.bind(ctx, data.fallbackUrl) } />
    );
  }

  buildOver18() {
    return (
      <a href={ this.props.listing.permalink } onClick={ this.expand.bind(this) } data-no-route='true'>
        <span className='h1 img-responsive img-nsfw text-center vertical-padding text-inverted'>
          NSFW
        </span>
      </a>
    );
  }

  previewImageUrl(listing, expanded) {
    if (!listing) { return; }

    var image;
    var width = this.state.windowWidth;

    if (expanded && listing.url.match(imgMatch)) {
      return listing.url;
    }

    if (listing.preview) {
      var preview = listing.preview.images[0];

      if (preview.resolutions) {
        var previewImage = preview.resolutions
                        .concat([ preview.source ])
                        .sort((a, b) => {
                          return a.width - b.width;
                        })
                        .find((r) => {
                          return r.width >= width;
                        });
      }

      if (previewImage) {
        return previewImage.url;
      } else {
        return preview.source.url;
      }
    }

    if (listing.media && listing.media.oembed) {
      return listing.media.oembed.thumbnail_url;
    }

    if (listing.url.match(imgMatch)) {
      return listing.url;
    }
  }

  buildContent() {
    var ctx = this;
    var props = this.props;
    var listing = props.listing;

    var expanded = this.state.expanded || this.props.single;

    if (!listing) {
      return;
    }

    var config = {
      https: props.https,
      httpsProxy: props.httpsProxy
    };
    var media = listing.media;
    var permalink = listing.cleanPermalink;

    var preview = this.previewImageUrl(listing, expanded);

    if (this.isNSFW(listing) && !this.state.expanded) {
      return this.buildOver18();
    }

    if (media && media.oembed) {
      if (media.oembed.type === 'image') {
        if (expanded) {
          return (
            <div className='listing-frame'>
              <iframe src={ adjustUrlToAppProtocol(listing.url, config) } frameBorder='0' height='80%' width='100%' allowFullScreen=''
                      sandbox='allow-scripts allow-forms allow-same-origin'
                      onError={ ctx.handleIFrameError.bind(ctx, listing.url) }></iframe>
            </div>
          );
        } else {
          return (
            <a href={ permalink }>
              {
                this.buildImage({
                  url: adjustUrlToAppProtocol(preview || media.oembed.thumbnail_url, config),
                  fallbackUrl: preview || media.oembed.thumbnail_url,
                  embed: media.oembed,
                })
              }
            </a>
          );
        }
      } else if (media.oembed.type === 'video') {
        if (expanded) {
          return (
            <div className='listing-video ratio16x9' dangerouslySetInnerHTML={{
              __html: listing.expandContent
            }} />
          );
        } else {
          return (
            <a href={ permalink } onClick={ this.expand.bind(this) } data-no-route='true'>
              {
                this.buildImage({
                  url: adjustUrlToAppProtocol(preview || media.oembed.thumbnail_url, config),
                  fallbackUrl: preview || media.oembed.thumbnai_url,
                  embed: media.oembed,
                  fixedRatio: true,
                  isVideo: true,
                })
              }
            </a>
          );
        }
      } else if (media.oembed.type === 'rich') {
        if (expanded) {
          return (
            <a href={ listing.url } data-no-route='true'>
              {
                this.buildImage({
                  url: adjustUrlToAppProtocol(preview || media.oembed.thumbnail_url, config),
                  fallbackUrl: preview || media.oembed.thumbnai_url,
                  embed: media.oembed,
                  fixedRatio: true,
                  isVideo: true,
                })
              }
            </a>
          );
        } else {
          return (
            <a href={ listing.url } data-no-route='true'>
              {
                this.buildImage({
                  url: adjustUrlToAppProtocol(preview || media.oembed.thumbnail_url, config),
                  fallbackUrl: preview || media.oembed.thumbnai_url,
                  embed: media.oembed,
                  fixedRatio: true,
                  isVideo: true,
                })
              }
            </a>
          );
        }
      }
    } else if (listing.url.match(imgMatch)) {
      if (expanded) {
        return (
          <a href={ listing.url } className='external-image'>
            {
              this.buildImage({
                url: adjustUrlToAppProtocol(listing.url, config),
                fallbackUrl: listing.url
              })
            }
          </a>
        );
      } else {
        return (
          <a href={ permalink }>
            {
              this.buildImage({
                url: adjustUrlToAppProtocol(preview || listing.url, config),
                fallbackUrl: preview || listing.url,
                isVideo: listing.url.match(gifMatch),
              })
            }
          </a>
        );
      }
    } else if (listing.selftext) {
      if (expanded) {
        return (
          <div className='well listing-selftext' dangerouslySetInnerHTML={{
            __html: listing.expandContent
          }} onClick={ this.expand.bind(this) } />
        );
      } else {
        return (
          <div className='well listing-selftext listing-selftext-collapsed' dangerouslySetInnerHTML={{
            __html: listing.expandContent
          }} onClick={ this.expand.bind(this) } />
        );
      }
    } else if (listing.domain.indexOf('self.') === 0) {
      return null;
    } else if (preview) {
      return (
        <a href={ permalink }>
          {
            this.buildImage({
              url: adjustUrlToAppProtocol(preview, config),
              fallbackUrl: preview,
            })
          }
        </a>
      );
    } else {
      return null;
    }
  }

  expand(e) {
    if (e.target && e.target.tagName === 'A' && e.target.href) {
      return true;
    } else {
      e.preventDefault();

      this.setState({
        expanded: !this.state.expanded,
      });
    }
  }

  isNSFW(listing) {
    if (!listing) { return; }

    return listing.title.match(/nsf[wl]/gi) || listing.over_18;
  }

  handleIFrameError(fallbackSrc, event) {
    if (event && event.currentTarget && fallbackSrc && event.currentTarget.src !== fallbackSrc) {
      event.currentTarget.src = fallbackSrc;
    }
  }

  handleImageError(fallbackSrc, event) {
    if (event && event.currentTarget && fallbackSrc && event.currentTarget.src !== fallbackSrc) {
      event.currentTarget.src = fallbackSrc;
    }
  }

  render() {
    var props = this.props;
    var listing = props.listing;
    var permalink = listing.cleanPermalink;
    var linkFlair;
    var nsfwFlair;
    var subredditLabel;
    var domain;
    var gilded;
    var distinguished = listing.distinguished ? `text-${listing.distinguished}` : '';
    var edited = listing.edited ? '*' : '';
    var linkFlairClass = (listing.link_flair_css_class);
    var listingClass = props.listingClass || '';
    var comment = listing.num_comments < 2 ? 'comment' : 'comments';
    var isSelf = listing.domain.indexOf('self.') === 0;

    var titleLink = mobilify(listing.url);
    var isRemote = titleLink === listing.url;
    var when;

    var expanded = this.state.expanded || this.props.single;

    if (!props.hideSubredditLabel) {
      subredditLabel = (
        <li>
          <a href={`/r/${listing.subreddit}`}>
            <span className='listing-subreddit'>
              r/{ listing.subreddit }
            </span>
          </a>
        </li>
      );
    }

    if (!props.hideWhen) {
      when = (<li>{ short(listing.created_utc * 1000) }</li>);
    }

    if (!isSelf && !props.hideDomain) {
      domain = (
        <li>{ listing.domain }</li>
      );
    } else if (props.sponsored) {
      domain = (
        <li className='text-primary sponsored-label'>Sponsored</li>
      );
    }

    if (listing.gilded && props.single) {
      gilded = (
        <li><span className='icon-gold-circled'/></li>
      );
    }

    if (listing.link_flair_text) {
      linkFlair = (
        <span className={ 'listing-link-flair label label-primary ' + linkFlairClass }>
          { listing.link_flair_text }
        </span>
      );
    }

    if (this.isNSFW(listing)) {
      nsfwFlair = (
        <span className='listing-link-flair label label-danger'>
          NSFW
        </span>
      );
    }

    var app = this.props.app;
    var buildContent = this.buildContent();
    if (buildContent) {
      var stalactite = <div className='stalactite'/>;
    }

    var extImageSource;

    if (expanded) {
      var url = isImgurDomain(listing.domain) ? listing.url.replace(imgMatch, '') : listing.url;
      extImageSource = (
        <div className="external-image-meta">
          <span>{listing.domain}</span>
          <span> | </span>
          <a href={url} data-no-route="true">{url}</a>
        </div>
      );
    }

    return (
      <article className={'listing ' + listingClass }>
        <div className='panel'>
          <header className={'panel-heading' + (buildContent?' preview':' no-preview') }>
            <div className='row'>
              <div className='col-xs-11'>
                <a href={ titleLink } className={ `panel-title ${distinguished}` }>
                  { `${listing.title} ${edited}` }
                </a>
              </div>
              <div className='col-xs-1'>
                <ListingDropdown listing={listing} app={app}/>
              </div>
            </div>

            <div className='linkbar-single-line'>
              <ul className='linkbar text-muted small'>
                { gilded }
                <li className='linkbar-item-no-seperator'>
                  <Vote
                    app={app}
                    thing={ listing }
                    token={ this.props.token }
                    api={ this.props.api }
                    apiOptions={ this.props.apiOptions }
                    loginPath={ this.props.loginPath }
                  />
                </li>
                <li className='linkbar-item-no-seperator'>
                  <strong><a href={ permalink }>{ `${listing.num_comments} ${comment}` }</a></strong>
                </li>
                { subredditLabel }
                { when }
                { domain }
              </ul>
            </div>

            <div className='link-flair-container vertical-spacing-top'>
              { nsfwFlair }
              { linkFlair }
            </div>

            { stalactite }
          </header>

          { buildContent }
        </div>

        { extImageSource }
      </article>
    );
  }
}

function ListingFactory(app) {
  Vote = VoteFactory(app);
  ListingDropdown = ListingDropdownFactory(app);
  PlayIcon = PlayIconFactory(app);

  return app.mutate('core/components/listing', Listing);
}

export default ListingFactory;

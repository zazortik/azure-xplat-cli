


<!DOCTYPE html>
<html>
  <head prefix="og: http://ogp.me/ns# fb: http://ogp.me/ns/fb# githubog: http://ogp.me/ns/fb/githubog#">
    <meta charset='utf-8'>
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>azure-sdk-tools-xplat/README.md at release-0.6.18 · guangyang/azure-sdk-tools-xplat</title>
    <link rel="search" type="application/opensearchdescription+xml" href="/opensearch.xml" title="GitHub" />
    <link rel="fluid-icon" href="https://github.com/fluidicon.png" title="GitHub" />
    <link rel="apple-touch-icon" sizes="57x57" href="/apple-touch-icon-114.png" />
    <link rel="apple-touch-icon" sizes="114x114" href="/apple-touch-icon-114.png" />
    <link rel="apple-touch-icon" sizes="72x72" href="/apple-touch-icon-144.png" />
    <link rel="apple-touch-icon" sizes="144x144" href="/apple-touch-icon-144.png" />
    <link rel="logo" type="image/svg" href="https://github-media-downloads.s3.amazonaws.com/github-logo.svg" />
    <meta property="og:image" content="https://github.global.ssl.fastly.net/images/modules/logos_page/Octocat.png">
    <meta name="hostname" content="fe3.rs.github.com">
    <link rel="assets" href="https://github.global.ssl.fastly.net/">
    <link rel="xhr-socket" href="/_sockets" />
    
    


    <meta name="msapplication-TileImage" content="/windows-tile.png" />
    <meta name="msapplication-TileColor" content="#ffffff" />
    <meta name="selected-link" value="repo_source" data-pjax-transient />
    <meta content="collector.githubapp.com" name="octolytics-host" /><meta content="github" name="octolytics-app-id" /><meta content="2089145" name="octolytics-actor-id" /><meta content="guangyang" name="octolytics-actor-login" /><meta content="90b43c9f0794de3f6104bc44769b9b4dad77dec6d4d3b40a7a8462221e8ee505" name="octolytics-actor-hash" />

    
    
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />

    <meta content="authenticity_token" name="csrf-param" />
<meta content="F22J2EpGp9Efl+RbwSYRMeQtB9RuhF+7C7CdlG6xelU=" name="csrf-token" />

    <link href="https://github.global.ssl.fastly.net/assets/github-18426ad2e511ad881d5d0a2b133329f94baf1305.css" media="all" rel="stylesheet" type="text/css" />
    <link href="https://github.global.ssl.fastly.net/assets/github2-c953fb181b68ee4b746ec8cdc6088e865cc2a02e.css" media="all" rel="stylesheet" type="text/css" />
    


      <script src="https://github.global.ssl.fastly.net/assets/frameworks-e8054ad804a1cf9e9849130fee5a4a5487b663ed.js" type="text/javascript"></script>
      <script src="https://github.global.ssl.fastly.net/assets/github-0444c1d0a0bb2f32a3c081d0aa3b6687cbd0ce39.js" type="text/javascript"></script>
      
      <meta http-equiv="x-pjax-version" content="012ce5e561582d6552e650e39a764c8a">

        <link data-pjax-transient rel='permalink' href='/guangyang/azure-sdk-tools-xplat/blob/87b5f4d420472ee3b319f5183e73eba9a16db24b/README.md'>
  <meta property="og:title" content="azure-sdk-tools-xplat"/>
  <meta property="og:type" content="githubog:gitrepository"/>
  <meta property="og:url" content="https://github.com/guangyang/azure-sdk-tools-xplat"/>
  <meta property="og:image" content="https://github.global.ssl.fastly.net/images/gravatars/gravatar-user-420.png"/>
  <meta property="og:site_name" content="GitHub"/>
  <meta property="og:description" content="azure-sdk-tools-xplat - Windows Azure Cross Platform Command Line"/>

  <meta name="description" content="azure-sdk-tools-xplat - Windows Azure Cross Platform Command Line" />

  <meta content="2089145" name="octolytics-dimension-user_id" /><meta content="guangyang" name="octolytics-dimension-user_login" /><meta content="8866272" name="octolytics-dimension-repository_id" /><meta content="guangyang/azure-sdk-tools-xplat" name="octolytics-dimension-repository_nwo" /><meta content="true" name="octolytics-dimension-repository_public" /><meta content="true" name="octolytics-dimension-repository_is_fork" /><meta content="6506651" name="octolytics-dimension-repository_parent_id" /><meta content="WindowsAzure/azure-sdk-tools-xplat" name="octolytics-dimension-repository_parent_nwo" /><meta content="6506651" name="octolytics-dimension-repository_network_root_id" /><meta content="WindowsAzure/azure-sdk-tools-xplat" name="octolytics-dimension-repository_network_root_nwo" />
  <link href="https://github.com/guangyang/azure-sdk-tools-xplat/commits/release-0.6.18.atom" rel="alternate" title="Recent Commits to azure-sdk-tools-xplat:release-0.6.18" type="application/atom+xml" />

  </head>


  <body class="logged_in page-blob windows vis-public fork env-production ">

    <div class="wrapper">
      
      
      


      <div class="header header-logged-in true">
  <div class="container clearfix">

    <a class="header-logo-invertocat" href="https://github.com/">
  <span class="mega-octicon octicon-mark-github"></span>
</a>

    <div class="divider-vertical"></div>

    
  <a href="/notifications" class="notification-indicator tooltipped downwards" title="You have unread notifications">
    <span class="mail-status unread"></span>
  </a>
  <div class="divider-vertical"></div>


      <div class="command-bar js-command-bar  in-repository">
          <form accept-charset="UTF-8" action="/search" class="command-bar-form" id="top_search_form" method="get">

<input type="text" data-hotkey="/ s" name="q" id="js-command-bar-field" placeholder="Search or type a command" tabindex="1" autocapitalize="off"
    
    data-username="guangyang"
      data-repo="guangyang/azure-sdk-tools-xplat"
      data-branch="release-0.6.18"
      data-sha="23d7f9aa3c266b0cba55149d738c266ae1078863"
  >

    <input type="hidden" name="nwo" value="guangyang/azure-sdk-tools-xplat" />

    <div class="select-menu js-menu-container js-select-menu search-context-select-menu">
      <span class="minibutton select-menu-button js-menu-target">
        <span class="js-select-button">This repository</span>
      </span>

      <div class="select-menu-modal-holder js-menu-content js-navigation-container">
        <div class="select-menu-modal">

          <div class="select-menu-item js-navigation-item js-this-repository-navigation-item selected">
            <span class="select-menu-item-icon octicon octicon-check"></span>
            <input type="radio" class="js-search-this-repository" name="search_target" value="repository" checked="checked" />
            <div class="select-menu-item-text js-select-button-text">This repository</div>
          </div> <!-- /.select-menu-item -->

          <div class="select-menu-item js-navigation-item js-all-repositories-navigation-item">
            <span class="select-menu-item-icon octicon octicon-check"></span>
            <input type="radio" name="search_target" value="global" />
            <div class="select-menu-item-text js-select-button-text">All repositories</div>
          </div> <!-- /.select-menu-item -->

        </div>
      </div>
    </div>

  <span class="octicon help tooltipped downwards" title="Show command bar help">
    <span class="octicon octicon-question"></span>
  </span>


  <input type="hidden" name="ref" value="cmdform">

</form>
        <ul class="top-nav">
            <li class="explore"><a href="/explore">Explore</a></li>
            <li><a href="https://gist.github.com">Gist</a></li>
            <li><a href="/blog">Blog</a></li>
          <li><a href="https://help.github.com">Help</a></li>
        </ul>
      </div>

    

  

    <ul id="user-links">
      <li>
        <a href="/guangyang" class="name">
          <img height="20" src="https://secure.gravatar.com/avatar/1292dfc5df2064e008f7f12b9c56561d?s=140&amp;d=https://a248.e.akamai.net/assets.github.com%2Fimages%2Fgravatars%2Fgravatar-user-420.png" width="20" /> guangyang
        </a>
      </li>

        <li>
          <a href="/new" id="new_repo" class="tooltipped downwards" title="Create a new repo">
            <span class="octicon octicon-repo-create"></span>
          </a>
        </li>

        <li>
          <a href="/settings/profile" id="account_settings"
            class="tooltipped downwards"
            title="Account settings ">
            <span class="octicon octicon-tools"></span>
          </a>
        </li>
        <li>
          <a class="tooltipped downwards" href="/logout" data-method="post" id="logout" title="Sign out">
            <span class="octicon octicon-log-out"></span>
          </a>
        </li>

    </ul>


<div class="js-new-dropdown-contents hidden">
  

<ul class="dropdown-menu">
  <li>
    <a href="/new"><span class="octicon octicon-repo-create"></span> New repository</a>
  </li>
  <li>
    <a href="/organizations/new"><span class="octicon octicon-organization"></span> New organization</a>
  </li>



    <li class="section-title">
      <span title="guangyang/azure-sdk-tools-xplat">This repository</span>
    </li>
    <li>
      <a href="/guangyang/azure-sdk-tools-xplat/issues/new"><span class="octicon octicon-issue-opened"></span> New issue</a>
    </li>
      <li>
        <a href="/guangyang/azure-sdk-tools-xplat/settings/collaboration"><span class="octicon octicon-person-add"></span> New collaborator</a>
      </li>
</ul>

</div>


    
  </div>
</div>

      

      




          <div class="site" itemscope itemtype="http://schema.org/WebPage">
    
    <div class="pagehead repohead instapaper_ignore readability-menu">
      <div class="container">
        

<ul class="pagehead-actions">

    <li class="subscription">
      <form accept-charset="UTF-8" action="/notifications/subscribe" data-autosubmit="true" data-remote="true" method="post"><div style="margin:0;padding:0;display:inline"><input name="authenticity_token" type="hidden" value="F22J2EpGp9Efl+RbwSYRMeQtB9RuhF+7C7CdlG6xelU=" /></div>  <input id="repository_id" name="repository_id" type="hidden" value="8866272" />

    <div class="select-menu js-menu-container js-select-menu">
      <span class="minibutton select-menu-button  js-menu-target">
        <span class="js-select-button">
          <span class="octicon octicon-eye-unwatch"></span>
          Unwatch
        </span>
      </span>

      <div class="select-menu-modal-holder">
        <div class="select-menu-modal subscription-menu-modal js-menu-content">
          <div class="select-menu-header">
            <span class="select-menu-title">Notification status</span>
            <span class="octicon octicon-remove-close js-menu-close"></span>
          </div> <!-- /.select-menu-header -->

          <div class="select-menu-list js-navigation-container">

            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <div class="select-menu-item-text">
                <input id="do_included" name="do" type="radio" value="included" />
                <h4>Not watching</h4>
                <span class="description">You only receive notifications for discussions in which you participate or are @mentioned.</span>
                <span class="js-select-button-text hidden-select-button-text">
                  <span class="octicon octicon-eye-watch"></span>
                  Watch
                </span>
              </div>
            </div> <!-- /.select-menu-item -->

            <div class="select-menu-item js-navigation-item selected">
              <span class="select-menu-item-icon octicon octicon octicon-check"></span>
              <div class="select-menu-item-text">
                <input checked="checked" id="do_subscribed" name="do" type="radio" value="subscribed" />
                <h4>Watching</h4>
                <span class="description">You receive notifications for all discussions in this repository.</span>
                <span class="js-select-button-text hidden-select-button-text">
                  <span class="octicon octicon-eye-unwatch"></span>
                  Unwatch
                </span>
              </div>
            </div> <!-- /.select-menu-item -->

            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <div class="select-menu-item-text">
                <input id="do_ignore" name="do" type="radio" value="ignore" />
                <h4>Ignoring</h4>
                <span class="description">You do not receive any notifications for discussions in this repository.</span>
                <span class="js-select-button-text hidden-select-button-text">
                  <span class="octicon octicon-mute"></span>
                  Stop ignoring
                </span>
              </div>
            </div> <!-- /.select-menu-item -->

          </div> <!-- /.select-menu-list -->

        </div> <!-- /.select-menu-modal -->
      </div> <!-- /.select-menu-modal-holder -->
    </div> <!-- /.select-menu -->

</form>
    </li>

    <li class="js-toggler-container js-social-container starring-container ">
      <a href="/guangyang/azure-sdk-tools-xplat/unstar" class="minibutton with-count js-toggler-target star-button starred upwards" title="Unstar this repo" data-remote="true" data-method="post" rel="nofollow">
        <span class="octicon octicon-star-delete"></span><span class="text">Unstar</span>
      </a>
      <a href="/guangyang/azure-sdk-tools-xplat/star" class="minibutton with-count js-toggler-target star-button unstarred upwards" title="Star this repo" data-remote="true" data-method="post" rel="nofollow">
        <span class="octicon octicon-star"></span><span class="text">Star</span>
      </a>
      <a class="social-count js-social-count" href="/guangyang/azure-sdk-tools-xplat/stargazers">0</a>
    </li>

        <li>
          <a href="/guangyang/azure-sdk-tools-xplat/fork" class="minibutton with-count js-toggler-target fork-button lighter upwards" title="Fork this repo" rel="facebox nofollow">
            <span class="octicon octicon-git-branch-create"></span><span class="text">Fork</span>
          </a>
          <a href="/guangyang/azure-sdk-tools-xplat/network" class="social-count">35</a>
        </li>


</ul>

        <h1 itemscope itemtype="http://data-vocabulary.org/Breadcrumb" class="entry-title public">
          <span class="repo-label"><span>public</span></span>
          <span class="mega-octicon octicon-repo-forked"></span>
          <span class="author">
            <a href="/guangyang" class="url fn" itemprop="url" rel="author"><span itemprop="title">guangyang</span></a></span
          ><span class="repohead-name-divider">/</span><strong
          ><a href="/guangyang/azure-sdk-tools-xplat" class="js-current-repository js-repo-home-link">azure-sdk-tools-xplat</a></strong>

          <span class="page-context-loader">
            <img alt="Octocat-spinner-32" height="16" src="https://github.global.ssl.fastly.net/images/spinners/octocat-spinner-32.gif" width="16" />
          </span>

            <span class="fork-flag">
              <span class="text">forked from <a href="/WindowsAzure/azure-sdk-tools-xplat">WindowsAzure/azure-sdk-tools-xplat</a></span>
            </span>
        </h1>
      </div><!-- /.container -->
    </div><!-- /.repohead -->

    <div class="container">

      <div class="repository-with-sidebar repo-container
            ">

          <div class="repository-sidebar">

              

<div class="repo-nav repo-nav-full js-repository-container-pjax js-octicon-loaders">
  <div class="repo-nav-contents">
    <ul class="repo-menu">
      <li class="tooltipped leftwards" title="Code">
        <a href="/guangyang/azure-sdk-tools-xplat/tree/release-0.6.18" class="js-selected-navigation-item selected" data-gotokey="c" data-pjax="true" data-selected-links="repo_source repo_downloads repo_commits repo_tags repo_branches /guangyang/azure-sdk-tools-xplat/tree/release-0.6.18">
          <span class="octicon octicon-code"></span> <span class="full-word">Code</span>
          <img alt="Octocat-spinner-32" class="mini-loader" height="16" src="https://github.global.ssl.fastly.net/images/spinners/octocat-spinner-32.gif" width="16" />
</a>      </li>


      <li class="tooltipped leftwards" title="Pull Requests"><a href="/guangyang/azure-sdk-tools-xplat/pulls" class="js-selected-navigation-item js-disable-pjax" data-gotokey="p" data-selected-links="repo_pulls /guangyang/azure-sdk-tools-xplat/pulls">
            <span class="octicon octicon-git-pull-request"></span> <span class="full-word">Pull Requests</span>
            <span class='counter'>0</span>
            <img alt="Octocat-spinner-32" class="mini-loader" height="16" src="https://github.global.ssl.fastly.net/images/spinners/octocat-spinner-32.gif" width="16" />
</a>      </li>


        <li class="tooltipped leftwards" title="Wiki">
          <a href="/guangyang/azure-sdk-tools-xplat/wiki" class="js-selected-navigation-item " data-pjax="true" data-selected-links="repo_wiki /guangyang/azure-sdk-tools-xplat/wiki">
            <span class="octicon octicon-book"></span> <span class="full-word">Wiki</span>
            <img alt="Octocat-spinner-32" class="mini-loader" height="16" src="https://github.global.ssl.fastly.net/images/spinners/octocat-spinner-32.gif" width="16" />
</a>        </li>


    </ul>
    <div class="repo-menu-separator"></div>
    <ul class="repo-menu">

      <li class="tooltipped leftwards" title="Pulse">
        <a href="/guangyang/azure-sdk-tools-xplat/pulse" class="js-selected-navigation-item " data-pjax="true" data-selected-links="pulse /guangyang/azure-sdk-tools-xplat/pulse">
          <span class="octicon octicon-pulse"></span> <span class="full-word">Pulse</span>
          <img alt="Octocat-spinner-32" class="mini-loader" height="16" src="https://github.global.ssl.fastly.net/images/spinners/octocat-spinner-32.gif" width="16" />
</a>      </li>

      <li class="tooltipped leftwards" title="Graphs">
        <a href="/guangyang/azure-sdk-tools-xplat/graphs" class="js-selected-navigation-item " data-pjax="true" data-selected-links="repo_graphs repo_contributors /guangyang/azure-sdk-tools-xplat/graphs">
          <span class="octicon octicon-graph"></span> <span class="full-word">Graphs</span>
          <img alt="Octocat-spinner-32" class="mini-loader" height="16" src="https://github.global.ssl.fastly.net/images/spinners/octocat-spinner-32.gif" width="16" />
</a>      </li>

      <li class="tooltipped leftwards" title="Network">
        <a href="/guangyang/azure-sdk-tools-xplat/network" class="js-selected-navigation-item js-disable-pjax" data-selected-links="repo_network /guangyang/azure-sdk-tools-xplat/network">
          <span class="octicon octicon-git-branch"></span> <span class="full-word">Network</span>
          <img alt="Octocat-spinner-32" class="mini-loader" height="16" src="https://github.global.ssl.fastly.net/images/spinners/octocat-spinner-32.gif" width="16" />
</a>      </li>

    </ul>

      <div class="repo-menu-separator"></div>
      <ul class="repo-menu">
        <li class="tooltipped leftwards" title="Settings">
          <a href="/guangyang/azure-sdk-tools-xplat/settings" data-pjax>
            <span class="octicon octicon-tools"></span> <span class="full-word">Settings</span>
            <img alt="Octocat-spinner-32" class="mini-loader" height="16" src="https://github.global.ssl.fastly.net/images/spinners/octocat-spinner-32.gif" width="16" />
          </a>
        </li>
      </ul>
  </div>
</div>


              <div class="only-with-full-nav">

                

  

<div class="clone-url open"
  data-protocol-type="http"
  data-url="/users/set_protocol?protocol_selector=http&amp;protocol_type=push">
  <h3><strong>HTTPS</strong> clone URL</h3>

  <input type="text" class="clone js-url-field"
         value="https://github.com/guangyang/azure-sdk-tools-xplat.git" readonly="readonly">

  <span class="js-zeroclipboard url-box-clippy minibutton zeroclipboard-button" data-clipboard-text="https://github.com/guangyang/azure-sdk-tools-xplat.git" data-copied-hint="copied!" title="copy to clipboard"><span class="octicon octicon-clippy"></span></span>
</div>

  

<div class="clone-url "
  data-protocol-type="ssh"
  data-url="/users/set_protocol?protocol_selector=ssh&amp;protocol_type=push">
  <h3><strong>SSH</strong> clone URL</h3>

  <input type="text" class="clone js-url-field"
         value="git@github.com:guangyang/azure-sdk-tools-xplat.git" readonly="readonly">

  <span class="js-zeroclipboard url-box-clippy minibutton zeroclipboard-button" data-clipboard-text="git@github.com:guangyang/azure-sdk-tools-xplat.git" data-copied-hint="copied!" title="copy to clipboard"><span class="octicon octicon-clippy"></span></span>
</div>

  

<div class="clone-url "
  data-protocol-type="subversion"
  data-url="/users/set_protocol?protocol_selector=subversion&amp;protocol_type=push">
  <h3><strong>Subversion</strong> checkout URL</h3>

  <input type="text" class="clone js-url-field"
         value="https://github.com/guangyang/azure-sdk-tools-xplat" readonly="readonly">

  <span class="js-zeroclipboard url-box-clippy minibutton zeroclipboard-button" data-clipboard-text="https://github.com/guangyang/azure-sdk-tools-xplat" data-copied-hint="copied!" title="copy to clipboard"><span class="octicon octicon-clippy"></span></span>
</div>



<p class="clone-options">You can clone with
    <a href="#" class="js-clone-selector" data-protocol="http">HTTPS</a>,
    <a href="#" class="js-clone-selector" data-protocol="ssh">SSH</a>,
    <a href="#" class="js-clone-selector" data-protocol="subversion">Subversion</a>,
  and <a href="https://help.github.com/articles/which-remote-url-should-i-use">other methods.</a>
</p>


  <a href="github-windows://openRepo/https://github.com/guangyang/azure-sdk-tools-xplat" class="minibutton sidebar-button">
    <span class="octicon octicon-device-desktop"></span>
    Clone in Desktop
  </a>


                  <a href="/guangyang/azure-sdk-tools-xplat/archive/release-0.6.18.zip"
                     class="minibutton sidebar-button"
                     title="Download this repository as a zip file"
                     rel="nofollow">
                    <span class="octicon octicon-cloud-download"></span>
                    Download ZIP
                  </a>

              </div>
          </div>

          <div id="js-repo-pjax-container" class="repository-content context-loader-container" data-pjax-container>
            


<!-- blob contrib key: blob_contributors:v21:550095a1af0ef917702be64a2d09cd14 -->
<!-- blob contrib frag key: views10/v8/blob_contributors:v21:550095a1af0ef917702be64a2d09cd14 -->

<p title="This is a placeholder element" class="js-history-link-replace hidden"></p>

<a href="/guangyang/azure-sdk-tools-xplat/find/release-0.6.18" data-pjax data-hotkey="t" style="display:none">Show File Finder</a>

<div class="file-navigation">
  


<div class="select-menu js-menu-container js-select-menu" >
  <span class="minibutton select-menu-button js-menu-target" data-hotkey="w"
    data-master-branch="master"
    data-ref="release-0.6.18">
    <span class="octicon octicon-git-branch"></span>
    <i>branch:</i>
    <span class="js-select-button">release-0.6.18</span>
  </span>

  <div class="select-menu-modal-holder js-menu-content js-navigation-container" data-pjax>

    <div class="select-menu-modal">
      <div class="select-menu-header">
        <span class="select-menu-title">Switch branches/tags</span>
        <span class="octicon octicon-remove-close js-menu-close"></span>
      </div> <!-- /.select-menu-header -->

      <div class="select-menu-filters">
        <div class="select-menu-text-filter">
          <input type="text" id="context-commitish-filter-field" class="js-filterable-field js-navigation-enable" placeholder="Find or create a branch…">
        </div>
        <div class="select-menu-tabs">
          <ul>
            <li class="select-menu-tab">
              <a href="#" data-tab-filter="branches" class="js-select-menu-tab">Branches</a>
            </li>
            <li class="select-menu-tab">
              <a href="#" data-tab-filter="tags" class="js-select-menu-tab">Tags</a>
            </li>
          </ul>
        </div><!-- /.select-menu-tabs -->
      </div><!-- /.select-menu-filters -->

      <div class="select-menu-list select-menu-tab-bucket js-select-menu-tab-bucket" data-tab-filter="branches">

        <div data-filterable-for="context-commitish-filter-field" data-filterable-type="substring">


            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/guangyang/azure-sdk-tools-xplat/blob/dev/README.md" class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target" data-name="dev" rel="nofollow" title="dev">dev</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/guangyang/azure-sdk-tools-xplat/blob/master/README.md" class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target" data-name="master" rel="nofollow" title="master">master</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/guangyang/azure-sdk-tools-xplat/blob/release-0.6.13/README.md" class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target" data-name="release-0.6.13" rel="nofollow" title="release-0.6.13">release-0.6.13</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/guangyang/azure-sdk-tools-xplat/blob/release-0.6.17/README.md" class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target" data-name="release-0.6.17" rel="nofollow" title="release-0.6.17">release-0.6.17</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item selected">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/guangyang/azure-sdk-tools-xplat/blob/release-0.6.18/README.md" class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target" data-name="release-0.6.18" rel="nofollow" title="release-0.6.18">release-0.6.18</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/guangyang/azure-sdk-tools-xplat/blob/s20/README.md" class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target" data-name="s20" rel="nofollow" title="s20">s20</a>
            </div> <!-- /.select-menu-item -->
        </div>

          <form accept-charset="UTF-8" action="/guangyang/azure-sdk-tools-xplat/branches" class="js-create-branch select-menu-item select-menu-new-item-form js-navigation-item js-new-item-form" method="post"><div style="margin:0;padding:0;display:inline"><input name="authenticity_token" type="hidden" value="F22J2EpGp9Efl+RbwSYRMeQtB9RuhF+7C7CdlG6xelU=" /></div>
            <span class="octicon octicon-git-branch-create select-menu-item-icon"></span>
            <div class="select-menu-item-text">
              <h4>Create branch: <span class="js-new-item-name"></span></h4>
              <span class="description">from ‘release-0.6.18’</span>
            </div>
            <input type="hidden" name="name" id="name" class="js-new-item-value">
            <input type="hidden" name="branch" id="branch" value="release-0.6.18" />
            <input type="hidden" name="path" id="branch" value="README.md" />
          </form> <!-- /.select-menu-item -->

      </div> <!-- /.select-menu-list -->

      <div class="select-menu-list select-menu-tab-bucket js-select-menu-tab-bucket" data-tab-filter="tags">
        <div data-filterable-for="context-commitish-filter-field" data-filterable-type="substring">


            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/guangyang/azure-sdk-tools-xplat/blob/v0.6.12-March2013/README.md" class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target" data-name="v0.6.12-March2013" rel="nofollow" title="v0.6.12-March2013">v0.6.12-March2013</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/guangyang/azure-sdk-tools-xplat/blob/v0.6.11-February2013/README.md" class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target" data-name="v0.6.11-February2013" rel="nofollow" title="v0.6.11-February2013">v0.6.11-February2013</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/guangyang/azure-sdk-tools-xplat/blob/v0.6.10-December2012/README.md" class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target" data-name="v0.6.10-December2012" rel="nofollow" title="v0.6.10-December2012">v0.6.10-December2012</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/guangyang/azure-sdk-tools-xplat/blob/v0.6.9-December2012/README.md" class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target" data-name="v0.6.9-December2012" rel="nofollow" title="v0.6.9-December2012">v0.6.9-December2012</a>
            </div> <!-- /.select-menu-item -->
            <div class="select-menu-item js-navigation-item ">
              <span class="select-menu-item-icon octicon octicon-check"></span>
              <a href="/guangyang/azure-sdk-tools-xplat/blob/v0.6.8-November2012/README.md" class="js-navigation-open select-menu-item-text js-select-button-text css-truncate-target" data-name="v0.6.8-November2012" rel="nofollow" title="v0.6.8-November2012">v0.6.8-November2012</a>
            </div> <!-- /.select-menu-item -->
        </div>

        <div class="select-menu-no-results">Nothing to show</div>
      </div> <!-- /.select-menu-list -->

    </div> <!-- /.select-menu-modal -->
  </div> <!-- /.select-menu-modal-holder -->
</div> <!-- /.select-menu -->

  <div class="breadcrumb">
    <span class='repo-root js-repo-root'><span itemscope="" itemtype="http://data-vocabulary.org/Breadcrumb"><a href="/guangyang/azure-sdk-tools-xplat/tree/release-0.6.18" data-branch="release-0.6.18" data-direction="back" data-pjax="true" itemscope="url"><span itemprop="title">azure-sdk-tools-xplat</span></a></span></span><span class="separator"> / </span><strong class="final-path">README.md</strong> <span class="js-zeroclipboard minibutton zeroclipboard-button" data-clipboard-text="README.md" data-copied-hint="copied!" title="copy to clipboard"><span class="octicon octicon-clippy"></span></span>
  </div>
</div>


  <div class="commit commit-loader file-history-tease js-deferred-content" data-url="/guangyang/azure-sdk-tools-xplat/contributors/release-0.6.18/README.md">
    Fetching contributors…

    <div class="participation">
      <p class="loader-loading"><img alt="Octocat-spinner-32-eaf2f5" height="16" src="https://github.global.ssl.fastly.net/images/spinners/octocat-spinner-32-EAF2F5.gif" width="16" /></p>
      <p class="loader-error">Cannot retrieve contributors at this time</p>
    </div>
  </div>

<div id="files" class="bubble">
  <div class="file">
    <div class="meta">
      <div class="info">
        <span class="icon"><b class="octicon octicon-file-text"></b></span>
        <span class="mode" title="File Mode">file</span>
          <span>584 lines (359 sloc)</span>
        <span>20.406 kb</span>
      </div>
      <div class="actions">
        <div class="button-group">
                <a class="minibutton"
                   href="/guangyang/azure-sdk-tools-xplat/edit/release-0.6.18/README.md"
                   data-method="post" rel="nofollow" data-hotkey="e">Edit</a>
          <a href="/guangyang/azure-sdk-tools-xplat/raw/release-0.6.18/README.md" class="button minibutton " id="raw-url">Raw</a>
            <a href="/guangyang/azure-sdk-tools-xplat/blame/release-0.6.18/README.md" class="button minibutton ">Blame</a>
          <a href="/guangyang/azure-sdk-tools-xplat/commits/release-0.6.18/README.md" class="button minibutton " rel="nofollow">History</a>
        </div><!-- /.button-group -->
            <a class="minibutton danger empty-icon tooltipped downwards"
               href="/guangyang/azure-sdk-tools-xplat/delete/release-0.6.18/README.md"
               title="" data-method="post" rel="nofollow">
            Delete
          </a>
      </div><!-- /.actions -->

    </div>
      
  <div id="readme" class="blob instapaper_body">
    <article class="markdown-body entry-content" itemprop="mainContentOfPage"><h1>
<a name="windows-azure-cli-tool-for-windows-mac-and-linux-" class="anchor" href="#windows-azure-cli-tool-for-windows-mac-and-linux-"><span class="octicon octicon-link"></span></a>Windows Azure CLI tool for Windows, Mac and Linux <a href="https://travis-ci.org/WindowsAzure/azure-sdk-tools-xplat"><img src="https://travis-ci.org/WindowsAzure/azure-sdk-tools-xplat.png?branch=master" alt="Build Status" style="max-width:100%;"></a>
</h1>

<p>This project provides a cross platform command line tool for developers and administrators to develop, deploy and manage Windows Azure applications.</p>

<h1>
<a name="cli-features" class="anchor" href="#cli-features"><span class="octicon octicon-link"></span></a>CLI Features</h1>

<ul>
<li>Accounts

<ul>
<li>Download and import Azure publish settings</li>
<li>Create and manage Storage Accounts</li>
</ul>
</li>
<li>Storage

<ul>
<li>Create and manage blob container and ACL</li>
</ul>
</li>
<li>Websites

<ul>
<li>Create and manage Windows Azure websites</li>
<li>Download site log files and get real time log streaming</li>
<li>Manage Deployments</li>
<li>Configure Github integration</li>
</ul>
</li>
<li>Virtual machines

<ul>
<li>Create and manage Windows and Linux Virtual machines</li>
<li>Create and manage VM endpoints</li>
<li>Create and manage Virtual Machine Images</li>
<li>Create and manage certificates</li>
</ul>
</li>
<li>Mobile Services

<ul>
<li>Create and manage Mobile Services</li>
<li>Manage tables, scripts, and configuration</li>
<li>Access logs</li>
<li>Access data</li>
</ul>
</li>
<li>Service Bus

<ul>
<li>Create and manage Service Bus namespaces</li>
</ul>
</li>
<li>Azure SQL Server

<ul>
<li>Create and manage SQL Servers, Firewall rules and Databases</li>
</ul>
</li>
</ul><h1>
<a name="getting-started" class="anchor" href="#getting-started"><span class="octicon octicon-link"></span></a>Getting Started</h1>

<h2>
<a name="download-source-code" class="anchor" href="#download-source-code"><span class="octicon octicon-link"></span></a>Download Source Code</h2>

<p>To get the source code of the SDK via <strong>git</strong> just type:</p>

<pre><code>git clone https://github.com/WindowsAzure/azure-sdk-tools-xplat.git
cd ./azure-sdk-tools-xplat
npm install 
</code></pre>

<h2>
<a name="install-the-npm-package" class="anchor" href="#install-the-npm-package"><span class="octicon octicon-link"></span></a>Install the npm package</h2>

<p>You can install the azure cli npm package directly. </p>

<pre><code>npm install -g azure-cli
</code></pre>

<h1>
<a name="using-the-cli" class="anchor" href="#using-the-cli"><span class="octicon octicon-link"></span></a>Using the cli</h1>

<p>The azure cli has several top-level commands, which correspond to different features of Windows Azure. Each top-level command is then broken up into further sub commands. Typing "azure" by itself or "azure --help" will list out each of the sub commands.</p>

<p>Below is a list of some of the more common commands and explanations on how to use them. </p>

<h2>
<a name="azure-account---managing-azure-accounts" class="anchor" href="#azure-account---managing-azure-accounts"><span class="octicon octicon-link"></span></a>azure account - Managing Azure accounts</h2>

<p>In order to use the CLI, you must first import credentials.</p>

<pre><code>azure account download
</code></pre>

<p>Download your credentials from Windows Azure. Logs you in to the Azure portal and downloads a publishsettings file.</p>

<pre><code>azure account import [file]
</code></pre>

<p>Imports previously downloaded credentials</p>

<h3>
<a name="azure-account-affinity-group---manage-azure-affinity-groups" class="anchor" href="#azure-account-affinity-group---manage-azure-affinity-groups"><span class="octicon octicon-link"></span></a>azure account affinity-group - Manage Azure Affinity Groups</h3>

<p>You can create and manage affinity groups.</p>

<pre><code>azure account affinity-group list
</code></pre>

<p>Lists all your affinity groups</p>

<pre><code>azure account affinity-group create [name]
</code></pre>

<p>Creates a new affinity group</p>

<p><strong>--location</strong> - Location for the affinity group </p>

<pre><code>azure account affinity-group show [name]
</code></pre>

<p>Display details about an affinity group</p>

<pre><code>azure account affinity-group delete [name]
</code></pre>

<p>Removes the affinity group</p>

<h3>
<a name="azure-account-storage---manage-azure-storage-accounts" class="anchor" href="#azure-account-storage---manage-azure-storage-accounts"><span class="octicon octicon-link"></span></a>azure account storage - Manage Azure Storage accounts</h3>

<p>You can create and manage store accounts for leveraging blobs, tables and queues within your applications.</p>

<pre><code>azure account storage list
</code></pre>

<p>Lists all your storage accounts</p>

<pre><code>azure account storage create [name]
</code></pre>

<p>Creates a new storage account</p>

<p><strong>--location</strong> - Location for the storage account </p>

<p><strong>--affinity-group</strong> - Affinity group for the storage account</p>

<p><strong>Note:</strong> Either location or affinity group is required.</p>

<pre><code>azure account storage update [name]
</code></pre>

<p>Updates a storage account label, description, etc.</p>

<pre><code>azure account storage delete [name]
</code></pre>

<p>Removes the storage account</p>

<pre><code>azure account storage keys list [name]
</code></pre>

<p>Lists out storage account keys for the specified account</p>

<pre><code>azure account storage keys renew [name]
</code></pre>

<p>Renews storage account keys for the specified account</p>

<h2>
<a name="azure-storage---managing-windows-azure-storage" class="anchor" href="#azure-storage---managing-windows-azure-storage"><span class="octicon octicon-link"></span></a>azure storage - Managing Windows Azure Storage</h2>

<p>You can list storage container</p>

<pre><code>azure storage container list -a &lt;account name&gt; -k &lt;access key&gt;
</code></pre>

<p>Lists all the containers in the storage account.</p>

<pre><code>azure storage container show -a &lt;account name&gt; -k &lt;access key&gt; [container]
</code></pre>

<p>Show the details for a specific container.</p>

<pre><code>azure storage container create -a &lt;account name&gt; -k &lt;access key&gt; [container]
</code></pre>

<p>Create a container</p>

<pre><code>azure storage container delete -a &lt;account name&gt; -k &lt;access key&gt; [container]
</code></pre>

<p>Delete a container</p>

<pre><code>azure storage container set -a &lt;account name&gt; -k &lt;access key&gt; -p &lt;permission&gt; [container]
</code></pre>

<p>Set the ACL of a specific container</p>

<h2>
<a name="azure-site---managing-windows-azure-websites" class="anchor" href="#azure-site---managing-windows-azure-websites"><span class="octicon octicon-link"></span></a>azure site - Managing Windows Azure Websites</h2>

<p>You can create websites for deploying static HTML, node.js, PHP, and .NET applications.</p>

<pre><code>azure site list
</code></pre>

<p>Lists all your websites</p>

<pre><code>azure site create [site]
</code></pre>

<p>Creates a new Windows Azure website. If run in a folder that has an app.js or a server.js, we will assume this is a node.js application and create an iisnode.yml file for configuring the node hosted environment. </p>

<p><strong>--git</strong> - create a git repo for deploying the application. Will call "git init" to initialize the local folder as repo and will add an "azure" remote for the remote repository. --publishingUsername can be used for scripting scenarios. If publishing user is not provider, you will be prompted. ex. "azure site create foo --git".</p>

<p><strong>--github</strong> - connect this website to a github repo. If run in a local repo, will use the remotes present. --githubusername / --githubpassword / -- githubrepository can be used for scripting scenarios. If these are not provided, you will be prompted. ex. "azure site create foo --github"</p>

<pre><code>azure site show [site]
</code></pre>

<p>Lists the details for a specific website. </p>

<pre><code>azure site browse [site]
</code></pre>

<p>Opens the website in the browser. </p>

<pre><code>azure site delete [site]
</code></pre>

<p>Deletes the current site. Will prompt for deletion.</p>

<pre><code>azure site stop [site]
</code></pre>

<p>Stops the website</p>

<pre><code>azure site start [site]
</code></pre>

<p>Starts the website</p>

<pre><code>azure site restart [site]
</code></pre>

<p>Stops and starts the website</p>

<pre><code>azure site deploymentscript 
</code></pre>

<p>Generates a bash or cmd script for customizing the deployment of your Website</p>

<p><strong>--quiet</strong> - overrides prompting for delete.</p>

<p><strong>Note:</strong> Above [site] is not required if the command is run in the main app folder.</p>

<h3>
<a name="azure-site-config---managing-site-app-settings" class="anchor" href="#azure-site-config---managing-site-app-settings"><span class="octicon octicon-link"></span></a>azure site config - Managing site app settings</h3>

<p>You can set application settings, which will propagate to environment variables for your node and PHP applications. Changes are instant, and you do not need to stop/start the app to pick up the new variables.</p>

<pre><code>azure site config list [site]
</code></pre>

<p>Lists all application settings.</p>

<pre><code>azure site config add [keyvaluepair] [site]
</code></pre>

<p>Adds a new app setting. [keyvaluepair] is of the form "[key]=[value]" i.e. "foo=bar".</p>

<pre><code>azure site config clear [key] [site]
</code></pre>

<p>Removes the specified app setting.</p>

<pre><code>azure site config get [key] [site]
</code></pre>

<p>Retrieves the value for the selected key.</p>

<pre><code>azure site log tail [options] [name]
</code></pre>

<p>Streams live diagnostic logs from your website to the console
<strong>--path [path]</strong> - Path under the LogFiles folder to pull logs from.</p>

<p><strong>--filter</strong> - Filter to match against for displaying log output.</p>

<p><strong>--log</strong> - Write output in a log format.</p>

<h3>
<a name="azure-site-scale---manage-scaling-mode-for-azure-websites" class="anchor" href="#azure-site-scale---manage-scaling-mode-for-azure-websites"><span class="octicon octicon-link"></span></a>azure site scale - Manage Scaling mode for Azure websites</h3>

<p>You can change your scale mode and number of instances for your websites in Windows Azure.</p>

<pre><code>azure site scale mode [name] [mode]
</code></pre>

<p>Set the web site scale mode</p>

<p><strong>--mode</strong> - The mode for the site: free, shared, or reserved</p>

<pre><code>azure site scale instances [name] [instances] [size]
</code></pre>

<p>Sets the number and size of instances for a web site</p>

<p><strong>instances</strong> - number of instances</p>

<p><strong>--size</strong> - size of instances to run: small, medium, or large</p>

<h2>
<a name="azure-vm---managing-windows-azure-virtual-machines" class="anchor" href="#azure-vm---managing-windows-azure-virtual-machines"><span class="octicon octicon-link"></span></a>azure vm - Managing Windows Azure virtual machines.</h2>

<p>You can create and manage both Windows and Linux virtual machines in Windows Azure.</p>

<pre><code>azure vm list
</code></pre>

<p>List your virtual machines and their statuses</p>

<pre><code>azure vm location list
</code></pre>

<p>List available locations for hosting virtual machines.</p>

<pre><code>azure vm create [name] [image] [username] [password] [location]
</code></pre>

<p>Create a new virtual machine using the specific image and credentials. An image can be a base image or an custom image uploaded to your account ex. "azure create myvm SUSE__openSUSE-12-1-20120603-en-us-30GB.vhd user pa$$w0rd westus".</p>

<p><strong>--ssh [port]</strong> - Enable a Linux VM to be remotely administered via ssh. By default port 22 is chosen.</p>

<p><strong>--rdp [port]</strong> - Enable a Windows VM to be remotely administered via RDP. By default port 3389 is chosen.</p>

<p><strong>--community</strong> - Specifies that the image is a community image</p>

<pre><code>azure vm create-from [name] [rolefile]
</code></pre>

<p>Create a virtual machine from a previously exported rolefile.</p>

<pre><code>azure vm export [name] [file]
</code></pre>

<p>Export a virtual machine definition.</p>

<pre><code>azure vm show [name]
</code></pre>

<p>Display details about the VM.</p>

<pre><code>azure vm shutdown [name]
</code></pre>

<p>Stop the virtual machine</p>

<pre><code>azure vm start
</code></pre>

<p>Start a previously shutdown virtual machine</p>

<pre><code>azure vm restart [name]
</code></pre>

<p>Restart the virtual machine</p>

<pre><code>azure vm delete [name]
</code></pre>

<p>Delete the virtual machine</p>

<h3>
<a name="azure-vm-image---managing-vm-images" class="anchor" href="#azure-vm-image---managing-vm-images"><span class="octicon octicon-link"></span></a>azure vm image - Managing VM images</h3>

<p>Windows Azure allows you to create virtual machines using a set of preconfigured based images or using your own custom images which you create either by uploaded, or saving an existing vm.</p>

<pre><code>azure vm image list
</code></pre>

<p>List base and custom vm images</p>

<pre><code>azure vm image show [image]
</code></pre>

<p>Show details about a specific image</p>

<pre><code>azure vm image create [name] [path]
</code></pre>

<p>Upload a new custom image. The path can point to a local file or a public hosted blob, including a secure blob.</p>

<p><strong>--os [os]</strong> - specify the OS, "Linux" or "Windows"</p>

<p><strong>--basevhd [blob]</strong> - Specify a base vhd blob url.</p>

<p><strong>--source-key [key]</strong> - If the blob is secured, specifies the access key.</p>

<pre><code>azure vm image delete [name]
</code></pre>

<p>Deletes the specified image.</p>

<h3>
<a name="azure-vm-disk---managing-vm-data-disks" class="anchor" href="#azure-vm-disk---managing-vm-data-disks"><span class="octicon octicon-link"></span></a>azure vm disk - Managing VM data disks</h3>

<p>You can create additional data disks, which you mount within your virtual machines.</p>

<pre><code>azure vm disk list
</code></pre>

<p>Lists available data disks</p>

<pre><code>azure vm disk show [name]
</code></pre>

<p>Displays details on a specific disk</p>

<pre><code>azure vm disk create [name] [path]
</code></pre>

<p>Uploads and creates a new disk using the specified path. The path can point to a local file or a public hosted blob, including a secure blob.</p>

<p><strong>--source-key [key]</strong> - If the blob is secured, specifies the access key.</p>

<pre><code>azure vm disk attach [vm-name] [image]
</code></pre>

<p>Attaches an image to an existing VM.</p>

<pre><code>azure vm disk detach [vm-name] [image]
</code></pre>

<p>Detaches an image from an existing VM.</p>

<h2>
<a name="azure-mobile---managing-azure-mobile-services" class="anchor" href="#azure-mobile---managing-azure-mobile-services"><span class="octicon octicon-link"></span></a>azure mobile - Managing Azure Mobile Services</h2>

<p>You can create and manage your mobile services right from the cli. You can create new services and databases, work directly with table data, and manage scripts and more.</p>

<pre><code>azure mobile list
</code></pre>

<p>Lists all mobile services for this subscription</p>

<pre><code>azure mobile create [servicename] [sqlAdminUsername] [sqlAdminPassword]
</code></pre>

<p>Creates a new mobile service using the specific service name. Also creates a new SQL Database using the specified user and password.</p>

<pre><code>azure mobile show [servicename]
</code></pre>

<p>Displays details about a mobile service including database details, applicationUrl and applicationKey</p>

<pre><code>azure mobile delete [servicename]
</code></pre>

<p>Deletes a mobile service </p>

<h2>
<a name="azure-mobile-scale---manage-scale-for-your-mobile-service" class="anchor" href="#azure-mobile-scale---manage-scale-for-your-mobile-service"><span class="octicon octicon-link"></span></a>azure mobile scale - Manage scale for your mobile service</h2>

<pre><code>azure mobile scale show [servicename]
</code></pre>

<p>Show the scalability settings of a mobile sservice</p>

<pre><code>azure mobile scale change [options] [servicename]
</code></pre>

<p>Change the scalability settings of a mobile service</p>

<p><strong>--computeMode [mode]</strong> - 'Free' or 'Reserved'</p>

<p><strong>--numberOfInstances [count]</strong> - number of instances in reserved mode.</p>

<pre><code>azure mobile log [servicename]
</code></pre>

<p>Retrieves mobile logs </p>

<h3>
<a name="azure-mobile-config---manage-your-mobile-service-configuration" class="anchor" href="#azure-mobile-config---manage-your-mobile-service-configuration"><span class="octicon octicon-link"></span></a>azure mobile config - Manage your mobile service configuration</h3>

<p>You can configure your Microsoft account, Facebook, Twitter, Google and push notification settings using these commands.</p>

<pre><code>azure mobile config list [servicename]
</code></pre>

<p>Lists the available mobile configuration settings and their values</p>

<pre><code>azure mobile config set [servicename] [key] [value]
</code></pre>

<p>Sets mobile configuration settings</p>

<pre><code>azure mobile config get [servicename] [key]
</code></pre>

<p>Gets a specific mobile configuration setting</p>

<h3>
<a name="azure-mobile-table---manage-your-mobile-service-tables" class="anchor" href="#azure-mobile-table---manage-your-mobile-service-tables"><span class="octicon octicon-link"></span></a>azure mobile table - Manage your mobile service tables</h3>

<pre><code>azure mobile table list [servicename]
</code></pre>

<p>List the tables for a specific service</p>

<pre><code>azure mobile table create [servicename] [tablename]
</code></pre>

<p>Creates a new table for your mobile service</p>

<p><strong>--permissions [permissions]</strong> - comma delimited list of = pairs</p>

<pre><code>azure mobile table show [servicename] [tablename]
</code></pre>

<p>Display table details such as the number of records, the list of columns and which scripts are defined.</p>

<pre><code>azure mobile table update [options] [servicename] [tablename] 
</code></pre>

<p>Updates mobile table schema, permissions and indexes</p>

<p><strong>--permissions [permissions]</strong> - comma delimited list of = pairs</p>

<p><strong>--deleteColumn [columns]</strong> - comma delimited list of columns to delete</p>

<pre><code>azure mobile table delete [servicename] [tablename]
</code></pre>

<p>Deletes a mobile table</p>

<h3>
<a name="azure-mobile-script---manage-your-mobile-service-scripts" class="anchor" href="#azure-mobile-script---manage-your-mobile-service-scripts"><span class="octicon octicon-link"></span></a>azure mobile script - Manage your mobile service scripts</h3>

<p>You can create and upload scripts for your table operations.</p>

<pre><code>azure mobile script list
</code></pre>

<p>List scripts for the specified service</p>

<pre><code>azure mobile script download [servicename] [scriptname]
</code></pre>

<p>Downloads the specified script. Table script names are in the format table/.{read|insert|update|delete} (e.g. table/todoitem.insert)</p>

<pre><code>azure mobile script upload [servicename] [scriptname]
</code></pre>

<p>Uploads a script</p>

<pre><code>azure mobile script delete [servicename] [scriptname]
</code></pre>

<p>Deletes a script</p>

<h3>
<a name="azure-mobile-data---manage-data-from-your-mobile-service" class="anchor" href="#azure-mobile-data---manage-data-from-your-mobile-service"><span class="octicon octicon-link"></span></a>azure mobile data - Manage data from your mobile service</h3>

<pre><code>azure mobile data read [servicename] [tablename] [query]
</code></pre>

<p>Query a mobile service table</p>

<pre><code>azure mobile data truncate [servicename] [tablename]
</code></pre>

<p>Delete all data from a mobile service table
<strong>--quiet</strong> - do not prompt before deleting</p>

<h3>
<a name="azure-mobile-job---manage-scheduled-jobs" class="anchor" href="#azure-mobile-job---manage-scheduled-jobs"><span class="octicon octicon-link"></span></a>azure mobile job - Manage scheduled jobs</h3>

<pre><code>azure mobile job list [servicename]
</code></pre>

<p>List jobs</p>

<pre><code>azure mobile job create [servicename] [jobname]
</code></pre>

<p>Create a new job</p>

<p><strong>--interval [number]</strong> - Interval for executing the job, defaults to 15.</p>

<p><strong>--intervalUnit [unit]</strong> - 'minute', 'hour', 'day', 'month' or 'none'. </p>

<p><strong>--startTime [time]</strong> - Time that the script should start in ISO format</p>

<pre><code>azure mobile job update [servicename] [jobname]
</code></pre>

<p>Update job settings</p>

<p><strong>--interval [number]</strong> - Interval for executing the job, defaults to 15.</p>

<p><strong>--intervalUnit [unit]</strong> - 'minute', 'hour', 'day', 'month' or 'none'. </p>

<p><strong>--startTime [time]</strong> - Time that the script should start in ISO format</p>

<p><strong>--status [status]</strong> - 'enabled' or 'disabled'</p>

<pre><code>azure mobile job delete [servicename] [jobname]
</code></pre>

<p>Delete a scheduled job</p>

<h2>
<a name="azure-sb---manage-your-service-bus-configuration" class="anchor" href="#azure-sb---manage-your-service-bus-configuration"><span class="octicon octicon-link"></span></a>azure sb - Manage your Service Bus configuration</h2>

<h3>
<a name="azure-sb-namespace---manage-your-service-bus-namespaces" class="anchor" href="#azure-sb-namespace---manage-your-service-bus-namespaces"><span class="octicon octicon-link"></span></a>azure sb namespace - Manage your Service Bus namespaces</h3>

<pre><code>azure sb namespace list
</code></pre>

<p>List all your Service Bus namespaces</p>

<pre><code>azure sb namespace create [namespace] [region]
</code></pre>

<p>Create a new Service Bus namespace in the specified region</p>

<pre><code>azure sb namespace show [name]
</code></pre>

<p>Display details about a namespace such as the connection string and endpoint information</p>

<pre><code>azure sb namespace check [name]
</code></pre>

<p>Check if a namespace is available</p>

<pre><code>azure sb namespace delete [name]
</code></pre>

<p>Delete a namespace</p>

<pre><code>azure sb namespace location list
</code></pre>

<p>Lists all available regions for creating new namespaces</p>

<h2>
<a name="azure-sql---manage-azure-sql" class="anchor" href="#azure-sql---manage-azure-sql"><span class="octicon octicon-link"></span></a>azure sql - Manage Azure SQL</h2>

<h3>
<a name="azure-sql-server---manage-your-azure-sql-servers" class="anchor" href="#azure-sql-server---manage-your-azure-sql-servers"><span class="octicon octicon-link"></span></a>azure sql server - Manage your Azure SQL Servers</h3>

<pre><code>azure sql server show [serverName]
</code></pre>

<p>Display server details</p>

<pre><code>azure sql server list
</code></pre>

<p>Lists all your Azure SQL Servers</p>

<pre><code>azure sql server create [administratorLogin] [administratorPassword] [location]
</code></pre>

<p>Create a new Azure SQL Server</p>

<p><strong>--administratorLogin</strong> - Administrator login user</p>

<p><strong>--administratorPassword</strong> - Administrator Password</p>

<p><strong>--location</strong> - Region where the server will be located</p>

<pre><code>azure sql server delete [serverName]
</code></pre>

<p>Delete an Azure SQL Server</p>

<h3>
<a name="azure-sql-firewallrule---manage-you-azure-sql-firewall-rules" class="anchor" href="#azure-sql-firewallrule---manage-you-azure-sql-firewall-rules"><span class="octicon octicon-link"></span></a>azure sql firewallrule - Manage you Azure SQL Firewall Rules</h3>

<pre><code>azure sql firewallrule create [serverName] [ruleName] [startIPAddress] [endIPAddress]
</code></pre>

<p>Create a new firewall rule</p>

<p><strong>--serverName</strong> - Server to create the rule on.</p>

<p><strong>--ruleName</strong> - Name for the rule</p>

<p><strong>--startIPAddress</strong> - Start IP Range for the rule</p>

<p><strong>--endIPAddress</strong> - (Optional) End IP Range for the rule. If not supplied this will equal startIPAddress.</p>

<pre><code>azure sql firewallrule show [serverName] [rulename]
</code></pre>

<p>Show details for a firewall rule</p>

<p><strong>--serverName</strong> - Server the rule resides on.</p>

<p><strong>--ruleName</strong> - Rule to show</p>

<pre><code>azure sql firewallrule list [serverName]
</code></pre>

<p>List all firewall rules on specified server.</p>

<p><strong>--serverName</strong> - Server to list rules for</p>

<pre><code>azure sql firewall delete [serverName] [ruleName]
</code></pre>

<p>Delete a rule</p>

<p><strong>--serverName</strong> - Server where the rule resides</p>

<p><strong>--ruleName</strong> - Rule to delete.</p>

<h3>
<a name="azure-sql-db---manage-azure-sql-databases" class="anchor" href="#azure-sql-db---manage-azure-sql-databases"><span class="octicon octicon-link"></span></a>azure sql db - Manage Azure SQL Databases</h3>

<pre><code>azure sql db create [serverName] [databaseName] [administratorLogin] [administratorPassword] [options]
</code></pre>

<p>Create a new database</p>

<p><strong>--serverName</strong> - Server to create the database on</p>

<p><strong>--databaseName</strong> - Name for the database</p>

<p><strong>--administratorLogin</strong> - Administrator login user</p>

<p><strong>--administratorPassword</strong> - Administrator Password</p>

<p><strong>--collationName</strong> - Collation for the DB</p>

<p><strong>--edition</strong> - Database edition</p>

<p><strong>--maxSizeInGB</strong> - Database max size</p>

<pre><code>azure sql db list [serverName] [administratorLogin] [administratorPassword]
</code></pre>

<p>List databases</p>

<p><strong>--serverName</strong> - Server to create the database on</p>

<p><strong>--administratorLogin</strong> - Administrator login user</p>

<p><strong>--administratorPassword</strong> - Administrator Password</p>

<pre><code>azure sql db show [serverName] [databaseName] [administratorLogin] [administratorPassword]
</code></pre>

<p>Show database details</p>

<p><strong>--serverName</strong> - Server to create the database on</p>

<p><strong>--databaseName</strong> - Name for the database</p>

<p><strong>--administratorLogin</strong> - Administrator login user</p>

<p><strong>--administratorPassword</strong> - Administrator Password</p>

<pre><code>azure sql db delete [serverName] [databaseName] [administratorPassword]
</code></pre>

<p>Delete a database</p>

<p><strong>--serverName</strong> - Server to create the database on</p>

<p><strong>--databaseName</strong> - Name for the database</p>

<p><strong>--administratorPassword</strong> - Administrator Password</p>

<p><strong>For more details on the commands, please see the <a href="http://go.microsoft.com/fwlink/?LinkId=252246&amp;clcid=0x409">command line tool reference</a> and this <a href="http://www.windowsazure.com/en-us/develop/nodejs/how-to-guides/command-line-tools/">How to Guide</a></strong></p>

<h1>
<a name="need-help" class="anchor" href="#need-help"><span class="octicon octicon-link"></span></a>Need Help?</h1>

<p>Be sure to check out the Windows Azure <a href="http://go.microsoft.com/fwlink/?LinkId=234489">Developer Forums on Stack Overflow</a> if you have trouble with the provided code.</p>

<h1>
<a name="contribute-code-or-provide-feedback" class="anchor" href="#contribute-code-or-provide-feedback"><span class="octicon octicon-link"></span></a>Contribute Code or Provide Feedback</h1>

<p>If you would like to become an active contributor to this project please follow the instructions provided in <a href="http://windowsazure.github.com/guidelines.html">Windows Azure Projects Contribution Guidelines</a>.</p>

<p>If you encounter any bugs with the library please file an issue in the <a href="https://github.com/WindowsAzure/azure-sdk-for-node/issues">Issues</a> section of the project.</p>

<h2>
<a name="running-tests" class="anchor" href="#running-tests"><span class="octicon octicon-link"></span></a>Running tests</h2>

<p>The tests included in the repository execute CLI commands against live Widows Azure management endpoints. In order to run the tests, you must have a Windows Azure subscription as well as a GitHub account. </p>

<p>Before running tests, you must take a one-time action to configure the CLI with the Windows Azure subscription by running</p>

<pre><code>azure account download
azure account import
</code></pre>

<p>Next, provide the following parameters by setting environment variables:</p>

<ul>
<li>
<code>AZURE_STORAGE_ACCOUNT</code> - your Windows Azure Storage Account name</li>
<li>
<code>AZURE_STORAGE_ACCESS_KEY</code> - secret access key to that Storage Account</li>
<li>
<code>AZURE_SERVICEBUS_NAMESPACE</code> - your Windows Azure Service Bus Namespace</li>
<li>
<code>AZURE_SERVICEBUS_ACCESS_KEY</code> - secret access to that Service Bus namespace</li>
<li>
<code>AZURE_GITHUB_USERNAME</code> - GitHub account username</li>
<li>
<code>AZURE_GITHUB_PASSWORD</code> - GitHub account password</li>
<li>
<code>AZURE_GITHUB_REPOSITORY</code> - name an empty GitHub repository to use during tests (e.g. <code>tjanczuk/clitest</code>)</li>
</ul><p>To run the tests, call</p>

<pre><code>npm test
</code></pre>

<p>from the root of your clone of the repository. Most tests execute against live Windows Azure management APIs, and running them takes considerable time. </p>

<p>Note: by default, the tests targeting the Windows Azure Mobile Services run against a mocked Windows Azure HTTP endpoints. In order to execute these tests against live Windows Azure management APIs instead, set the <code>NOCK_OFF=true</code> environment variable before running the tests. </p>

<h1>
<a name="learn-more" class="anchor" href="#learn-more"><span class="octicon octicon-link"></span></a>Learn More</h1>

<p>For documentation on how to host Node.js applications on Windows Azure, please see the <a href="http://www.windowsazure.com/en-us/develop/nodejs/">Windows Azure Node.js Developer Center</a>.</p>

<p>For more extensive  documentation on the new cross platform CLI tool for Mac and Linux, please see this <a href="http://go.microsoft.com/fwlink/?LinkId=252246&amp;clcid=0x409">reference</a> and this <a href="http://www.windowsazure.com/en-us/develop/nodejs/how-to-guides/command-line-tools/">How to Guide</a></p>

<p>Check out our new IRC channel on freenode, node-azure.</p></article>
  </div>

  </div>
</div>

<a href="#jump-to-line" rel="facebox[.linejump]" data-hotkey="l" class="js-jump-to-line" style="display:none">Jump to Line</a>
<div id="jump-to-line" style="display:none">
  <form accept-charset="UTF-8" class="js-jump-to-line-form">
    <input class="linejump-input js-jump-to-line-field" type="text" placeholder="Jump to line&hellip;" autofocus>
    <button type="submit" class="button">Go</button>
  </form>
</div>

          </div>
        </div>

      </div><!-- /.repo-container -->
      <div class="modal-backdrop"></div>
    </div>
  </div><!-- /.site -->


    </div><!-- /.wrapper -->

      <div class="container">
  <div class="site-footer">
    <ul class="site-footer-links right">
      <li><a href="https://status.github.com/">Status</a></li>
      <li><a href="http://developer.github.com">API</a></li>
      <li><a href="http://training.github.com">Training</a></li>
      <li><a href="http://shop.github.com">Shop</a></li>
      <li><a href="/blog">Blog</a></li>
      <li><a href="/about">About</a></li>

    </ul>

    <a href="/">
      <span class="mega-octicon octicon-mark-github"></span>
    </a>

    <ul class="site-footer-links">
      <li>&copy; 2013 <span title="0.23865s from fe3.rs.github.com">GitHub</span>, Inc.</li>
        <li><a href="/site/terms">Terms</a></li>
        <li><a href="/site/privacy">Privacy</a></li>
        <li><a href="/security">Security</a></li>
        <li><a href="/contact">Contact</a></li>
    </ul>
  </div><!-- /.site-footer -->
</div><!-- /.container -->


    <div class="fullscreen-overlay js-fullscreen-overlay" id="fullscreen_overlay">
  <div class="fullscreen-container js-fullscreen-container">
    <div class="textarea-wrap">
      <textarea name="fullscreen-contents" id="fullscreen-contents" class="js-fullscreen-contents" placeholder="" data-suggester="fullscreen_suggester"></textarea>
          <div class="suggester-container">
              <div class="suggester fullscreen-suggester js-navigation-container" id="fullscreen_suggester"
                 data-url="/guangyang/azure-sdk-tools-xplat/suggestions/commit">
              </div>
          </div>
    </div>
  </div>
  <div class="fullscreen-sidebar">
    <a href="#" class="exit-fullscreen js-exit-fullscreen tooltipped leftwards" title="Exit Zen Mode">
      <span class="mega-octicon octicon-screen-normal"></span>
    </a>
    <a href="#" class="theme-switcher js-theme-switcher tooltipped leftwards"
      title="Switch themes">
      <span class="octicon octicon-color-mode"></span>
    </a>
  </div>
</div>



    <div id="ajax-error-message" class="flash flash-error">
      <span class="octicon octicon-alert"></span>
      <a href="#" class="octicon octicon-remove-close close ajax-error-dismiss"></a>
      Something went wrong with that request. Please try again.
    </div>

    
  </body>
</html>


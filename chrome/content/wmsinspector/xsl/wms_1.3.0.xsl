<?xml version="1.0" encoding="utf-8"?>
<!--
    TODO: layers's styles, <Identifier>, etc.
-->

<!DOCTYPE overlay SYSTEM "chrome://wmsinspector/locale/strings.dtd">

<xsl:stylesheet version="1.0"
                xmlns:w="http://www.opengis.net/wms"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xlink="http://www.w3.org/1999/xlink">

    <xsl:output method="xml"
                media-type="text/html"
                doctype-public="-//W3C//DTD XHTML 1.0 Strict//EN"
                doctype-system="http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"
                cdata-section-elements="script style"
                indent="yes"
                encoding="UTF-8"/>

    <xsl:template name="serviceT" match="w:WMS_Capabilities/w:Service">
        <h1>&wmsinspector.xsl.service;</h1>
        <div class="divSection">

            <h2 class="header expanded" id="headerGeneralInfo">&wmsinspector.xsl.generalinfo;</h2>

            <div class="divSubSection" id="divGeneralInfo">
                <table>
                    <xsl:call-template name="checkElementOutputT">
                        <xsl:with-param name="element" select="/w:WMT_MS_Capabilities/@version" />
                        <xsl:with-param name="elementLabel">&wmsinspector.xsl.version;:</xsl:with-param>
                        <xsl:with-param name="mandatory" select="true()"/>
                        <xsl:with-param name="outputRow" select="true()"/>
                    </xsl:call-template>

                    <xsl:call-template name="checkElementOutputT">
                        <xsl:with-param name="element" select="w:Name" />
                        <xsl:with-param name="elementLabel">&wmsinspector.xsl.name;:</xsl:with-param>
                        <xsl:with-param name="mandatory" select="true()"/>
                        <xsl:with-param name="outputRow" select="true()"/>
                    </xsl:call-template>

                    <xsl:call-template name="checkElementOutputT">
                        <xsl:with-param name="element" select="w:Title" />
                        <xsl:with-param name="elementLabel">&wmsinspector.xsl.title;:</xsl:with-param>
                        <xsl:with-param name="mandatory" select="true()"/>
                        <xsl:with-param name="outputRow" select="true()"/>
                    </xsl:call-template>

                    <xsl:call-template name="checkElementOutputT">
                        <xsl:with-param name="element" select="w:OnlineResource/@xlink:href" />
                        <xsl:with-param name="elementLabel">&wmsinspector.xsl.onlineresource;:</xsl:with-param>
                        <xsl:with-param name="mandatory" select="true()"/>
                        <xsl:with-param name="outputRow" select="true()"/>
                        <xsl:with-param name="outputLink" select="true()"/>
                    </xsl:call-template>

                    <xsl:call-template name="checkElementOutputT">
                        <xsl:with-param name="element" select="w:Abstract" />
                        <xsl:with-param name="elementLabel">&wmsinspector.xsl.abstract;:</xsl:with-param>
                        <xsl:with-param name="outputRow" select="true()"/>
                    </xsl:call-template>

                    <tr>
                        <th>&wmsinspector.xsl.keywords;:</th>
                        <td>
                            <xsl:choose>
                                <xsl:when test="w:KeywordList">
                                    <xsl:for-each select="w:KeywordList/w:Keyword">
                                        <xsl:if test="position() > 1">, </xsl:if>
                                        <xsl:value-of select="." />
                                    </xsl:for-each>
                                </xsl:when>
                                <xsl:otherwise>
                                    <xsl:call-template name="undefined" />
                                </xsl:otherwise>
                            </xsl:choose>
                        </td>
                    </tr>
                </table>

            </div>
            <h2 class="header collapsed" id="headerContactDetails">&wmsinspector.xsl.contactdetails;</h2>
            <div class="divSubSection" id="divContactDetails" style="display:none">
                <xsl:choose>
                    <xsl:when test="w:ContactInformation">
                        <xsl:apply-templates select="w:ContactInformation" />
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:call-template name="undefined" />
                    </xsl:otherwise>
                </xsl:choose>
            </div>
            <h2 class="header collapsed" id="headerAccessConditions">&wmsinspector.xsl.accessconditions;</h2>
            <div class="divSubSection" id="divAccessConditions" style="display:none">
                <xsl:choose>
                    <xsl:when test="normalize-space(w:Fees) or normalize-space(w:AccessConstraints) or normalize-space(w:LayerLimit) or normalize-space(w:MaxWidth) or normalize-space(w:MaxHeight)">
                        <table>
                            <xsl:call-template name="checkElementOutputT">
                                <xsl:with-param name="element" select="w:Fees" />
                                <xsl:with-param name="elementLabel">&wmsinspector.xsl.fees;:</xsl:with-param>
                            </xsl:call-template>
                            <xsl:call-template name="checkElementOutputT">
                                <xsl:with-param name="element" select="w:AccessConstraints" />
                                <xsl:with-param name="elementLabel">&wmsinspector.xsl.accessconstraints;:</xsl:with-param>
                            </xsl:call-template>
                            <xsl:call-template name="checkElementOutputT">
                                <xsl:with-param name="element" select="w:LayerLimit" />
                                <xsl:with-param name="elementLabel">&wmsinspector.xsl.layerlimit;:</xsl:with-param>
                            </xsl:call-template>
                            <xsl:call-template name="checkElementOutputT">
                                <xsl:with-param name="element" select="w:MaxWidth" />
                                <xsl:with-param name="elementLabel">&wmsinspector.xsl.maxwidth;:</xsl:with-param>
                            </xsl:call-template>
                            <xsl:call-template name="checkElementOutputT">
                                <xsl:with-param name="element" select="w:MaxHeight" />
                                <xsl:with-param name="elementLabel">&wmsinspector.xsl.maxheight;:</xsl:with-param>
                            </xsl:call-template>
                        </table>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:call-template name="undefined" />
                    </xsl:otherwise>
                </xsl:choose>
            </div>
        </div>
    </xsl:template>

    <xsl:template name="contactT" match="w:ContactInformation">
        <xsl:choose>
            <xsl:when test="normalize-space(.)">
                <table>

                    <xsl:call-template name="checkElementOutputT">
                        <xsl:with-param name="element" select="w:ContactPersonPrimary/w:ContactPerson" />
                        <xsl:with-param name="elementLabel">&wmsinspector.xsl.contactperson;:</xsl:with-param>
                    </xsl:call-template>

                    <xsl:call-template name="checkElementOutputT">
                        <xsl:with-param name="element" select="w:ContactPersonPrimary/w:ContactOrganization" />
                        <xsl:with-param name="elementLabel">&wmsinspector.xsl.contactorganization;:</xsl:with-param>
                    </xsl:call-template>


                    <xsl:call-template name="checkElementOutputT">
                        <xsl:with-param name="element" select="w:ContactPosition" />
                        <xsl:with-param name="elementLabel">&wmsinspector.xsl.contactposition;:</xsl:with-param>
                    </xsl:call-template>


                    <xsl:if test="normalize-space(w:ContactAddress)">
                        <tr>
                            <th>&wmsinspector.xsl.contactaddress;
                                <xsl:if test="normalize-space(w:ContactAddress/w:AddressType)">
                                    (<xsl:value-of select="w:ContactAddress/w:AddressType" />)
                                </xsl:if>:
                            </th>
                            <td>
                                <xsl:if test="normalize-space(w:ContactAddress/w:Address)">
                                    <xsl:value-of select="w:ContactAddress/w:Address" />
                                </xsl:if>
                                <xsl:if test="normalize-space(w:ContactAddress/w:City) or normalize-space(w:ContactAddress/w:StateOrProvince)">
                                    <div>
                                        <xsl:if test="normalize-space(w:ContactAddress/w:City)">
                                            <xsl:value-of select="w:ContactAddress/w:City" />
                                        </xsl:if>
                                        <xsl:if test="normalize-space(ContactAddress/StateOrProvince)"> (
                                            <xsl:value-of select="ContactAddress/StateOrProvince" />)
                                        </xsl:if>
                                    </div>
                                </xsl:if>
                                <xsl:if test="normalize-space(w:ContactAddress/w:PostCode) or normalize-space(w:ContactAddress/w:Country)">
                                    <div>
                                        <xsl:if test="normalize-space(w:ContactAddress/w:PostCode)">
                                            <xsl:value-of select="w:ContactAddress/w:PostCode" />
                                        </xsl:if>
                                        <xsl:if test="normalize-space(w:ContactAddress/w:Country)"> -
                                            <xsl:value-of select="w:ContactAddress/w:Country" />
                                        </xsl:if>
                                    </div>
                                </xsl:if>
                            </td>
                        </tr>
                    </xsl:if>

                    <xsl:call-template name="checkElementOutputT">
                        <xsl:with-param name="element" select="w:ContactVoiceTelephone" />
                        <xsl:with-param name="elementLabel">&wmsinspector.xsl.contacttelephone;:</xsl:with-param>
                    </xsl:call-template>

                    <xsl:call-template name="checkElementOutputT">
                        <xsl:with-param name="element" select="w:ContactFacsimileTelephone" />
                        <xsl:with-param name="elementLabel">&wmsinspector.xsl.contactfax;:</xsl:with-param>
                    </xsl:call-template>

                    <xsl:call-template name="checkElementOutputT">
                        <xsl:with-param name="element" select="w:ContactElectronicMailAddress" />
                        <xsl:with-param name="elementLabel">&wmsinspector.xsl.contactemail;:</xsl:with-param>
                        <xsl:with-param name="outputLink" select="'mailto'"/>
                    </xsl:call-template>

                </table>
            </xsl:when>
            <xsl:otherwise>
                <xsl:call-template name="undefined" />
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>


    <xsl:template name="capabilityT" match="w:WMS_Capabilities/w:Capability">
        <h1>&wmsinspector.xsl.capabilities;</h1>
        <div class="divSection">

            <h2 class="header expanded" id="headerAvailableRequests">&wmsinspector.xsl.availablerequests;</h2>
            <div class="divSubSection" id="divAvailableRequests">
                <table>
                    <xsl:for-each select="w:Request/*">
                        <tr>
                            <th>
                                <xsl:value-of select="local-name()" />
                            </th>
                            <td>
                                <xsl:for-each select="w:Format">
                                    <div>
                                        <xsl:value-of select="." />
                                    </div>
                                </xsl:for-each>
                            </td>
                            <td>
                                <xsl:for-each select="w:DCPType/w:HTTP/*">
                                    <div>
                                        <span class="spanMethod">
                                            <xsl:value-of select="local-name()" />
                                        </span>
                                        <a href="{w:OnlineResource/@xlink:href}">
                                            <xsl:value-of select="w:OnlineResource/@xlink:href" />
                                        </a>
                                    </div>
                                </xsl:for-each>
                            </td>
                        </tr>
                    </xsl:for-each>
                </table>
            </div>

            <h2 class="header collapsed" id="headerAvailableExceptions">&wmsinspector.xsl.exceptions;</h2>
            <div class="divSubSection" id="divAvailableExceptions" style="display: none">
                <xsl:if test="normalize-space(w:Exception)">
                    <table>
                        <xsl:for-each select="w:Exception/w:Format">
                            <tr>
                                <td>
                                    <xsl:value-of select="." />
                                </td>
                            </tr>
                        </xsl:for-each>

                    </table>
                </xsl:if>
            </div>

            <xsl:if test="w:UserDefinedSymbolization">
                <h2 class="header collapsed" id="headerUserDefinedSymbolization">&wmsinspector.xsl.userdefinedsymbolization;</h2>
                <div class="divSubSection" id="divUserDefinedSymbolization" style="display: none">
                    <table>

                        <xsl:call-template name="checkElementBooleanOutputT">
                            <xsl:with-param name="element" select="w:UserDefinedSymbolization/@SupportSLD" />
                            <xsl:with-param name="elementLabel">&wmsinspector.xsl.supportsld;:</xsl:with-param>
                            <xsl:with-param name="outputRow" select="true()"/>
                        </xsl:call-template>

                        <xsl:call-template name="checkElementBooleanOutputT">
                            <xsl:with-param name="element" select="w:UserDefinedSymbolization/@UserLayer" />
                            <xsl:with-param name="elementLabel">&wmsinspector.xsl.userlayer;:</xsl:with-param>
                            <xsl:with-param name="outputRow" select="true()"/>
                        </xsl:call-template>

                        <xsl:call-template name="checkElementBooleanOutputT">
                            <xsl:with-param name="element" select="w:UserDefinedSymbolization/@UserStyle" />
                            <xsl:with-param name="elementLabel">&wmsinspector.xsl.userstyle;:</xsl:with-param>
                            <xsl:with-param name="outputRow" select="true()"/>
                        </xsl:call-template>

                        <xsl:call-template name="checkElementBooleanOutputT">
                            <xsl:with-param name="element" select="w:UserDefinedSymbolization/@RemoteWFS" />
                            <xsl:with-param name="elementLabel">&wmsinspector.xsl.remotewfs;:</xsl:with-param>
                            <xsl:with-param name="outputRow" select="true()"/>
                        </xsl:call-template>

                    </table>
                </div>
            </xsl:if>

            <h2 class="header expanded" id="headerLayers">&wmsinspector.xsl.layers;</h2>
            <div class="divSubSection" id="divLayers">
                <table id="tableLayers">
                    <tr>
                        <th>&wmsinspector.xsl.name;</th>
                        <th>&wmsinspector.xsl.title;</th>
                        <th>&wmsinspector.xsl.crs;</th>
                        <th>&wmsinspector.xsl.queryable;?</th>
                        <th>&wmsinspector.xsl.opaque;?</th>
                    </tr>

                    <xsl:for-each select="w:Layer">
                        <xsl:call-template name="layerT">
                            <xsl:with-param name="layerLevel" select="1" />
                        </xsl:call-template>
                    </xsl:for-each>

                </table>
            </div>



        </div>
    </xsl:template>
    <xsl:template name="layerT">

        <xsl:param name="layerLevel">1</xsl:param>
        <xsl:variable name="layerId" select="generate-id(.)">

        </xsl:variable>

        <tr>
            <td>
                <div class="header collapsed headerLayer" id="headerLayer_{$layerId}" style="margin-left:{$layerLevel }em" >
                    <xsl:choose>
                        <xsl:when test="normalize-space(w:Name)">
                            <strong>
                                <xsl:value-of select="w:Name" />
                            </strong>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:call-template name="undefined" />
                        </xsl:otherwise>

                    </xsl:choose>
                </div>
            </td>
            <td>
                <xsl:choose>
                    <xsl:when test="normalize-space(w:Title)">
                        <xsl:value-of select="w:Title" />
                    </xsl:when>
                    <xsl:otherwise>
                        <span class="undefined mandatory "> [&wmsinspector.xsl.layertitleundefined;] </span>
                        <div class="divIcon divIconError" title="&wmsinspector.xsl.mandatoryelement;"></div>
                    </xsl:otherwise>
                </xsl:choose>
            </td>
            <td>
                <xsl:for-each select="w:CRS">
                    <xsl:if test="position() > 1">, </xsl:if>
                    <xsl:value-of select="." />
                </xsl:for-each>
            </td>
            <td>
                <xsl:call-template name="checkElementBooleanT">
                    <xsl:with-param name="element" select="@queryable" />
                </xsl:call-template>

            </td>
            <td>
                <xsl:call-template name="checkElementBooleanT">
                    <xsl:with-param name="element" select="@opaque" />
                </xsl:call-template>
            </td>
        </tr>

        <tr>
            <td colspan="5">
                <div id="divLayer_{$layerId}" style="display:none; margin-left:{$layerLevel }em">
                    <div class="divLegend">
                        <xsl:choose>
                            <xsl:when test="w:Style/w:LegendURL/w:OnlineResource/@xlink:href">
                                <img src="{w:Style/w:LegendURL/w:OnlineResource/@xlink:href}" alt="&wmsinspector.xsl.legend;" title="&wmsinspector.xsl.legend;"/>
                            </xsl:when>
                            <xsl:when test="/w:WMS_Capabilities/w:Capability/w:Request/w:GetLegendGraphic/w:DCPType/w:HTTP/w:Get/w:OnlineResource/@xlink:href">
                                <img src="{/w:WMS_Capabilities/w:Capability/w:Request/w:GetLegendGraphic/w:DCPType/w:HTTP/w:Get/w:OnlineResource/@xlink:href}REQUEST=GetLegendGraphic&amp;SERVICE=WMS&amp;VERSION=1.3.0&amp;FORMAT={/w:WMS_Capabilities/w:Capability/w:Request/w:GetLegendGraphic/w:Format}&amp;LAYER={Name}" alt="" />
                            </xsl:when>
                            <xsl:otherwise>
                                <span class="undefined"></span>
                            </xsl:otherwise>
                        </xsl:choose>
                    </div>
                    <table class="tableDetails">
                        <xsl:call-template name="checkElementOutputT">
                            <xsl:with-param name="element" select="w:Abstract" />
                            <xsl:with-param name="elementLabel">&wmsinspector.xsl.abstract;:</xsl:with-param>
                        </xsl:call-template>

                        <xsl:if test="w:KeywordList">
                            <tr>
                                <th>&wmsinspector.xsl.keywords;:</th>
                                <td>

                                    <xsl:for-each select="w:KeywordList/w:Keyword">
                                        <xsl:if test="position() > 1">, </xsl:if>
                                        <xsl:value-of select="." />
                                    </xsl:for-each>

                                </td>
                            </tr>
                        </xsl:if>

                        <tr>
                            <th>&wmsinspector.xsl.extent; (WGS84):</th>
                            <td>
                                <xsl:choose>
                                    <xsl:when test="EX_GeographicBoundingBox">
                                        <xsl:value-of select="EX_GeographicBoundingBox/westBoundLongitude" />,
                                        <xsl:value-of select="EX_GeographicBoundingBox/southBoundLatitude" />,
                                        <xsl:value-of select="EX_GeographicBoundingBox/eastBoundLongitude" />,
                                        <xsl:value-of select="EX_GeographicBoundingBox/northBoundLatitude" />
                                    </xsl:when>
                                    <xsl:otherwise>
                                        <xsl:call-template name="undefined" />
                                    </xsl:otherwise>
                                </xsl:choose>
                            </td>
                        </tr>
                        <xsl:for-each select="BoundingBox">
                            <tr>
                                <th>&wmsinspector.xsl.extent; (<xsl:value-of select="./@CRS" />):</th>
                                <td>
                                    <xsl:value-of select="./@minx" />,
                                    <xsl:value-of select="./@miny" />,
                                    <xsl:value-of select="./@maxx" />,
                                    <xsl:value-of select="./@maxy" />
                                    <xsl:if test="./@resx or ./@resy">
                                        (&wmsinspector.xsl.resolution;: <xsl:value-of select="./@resx" />,<xsl:value-of select="./@resy" />)
                                    </xsl:if>
                                </td>
                            </tr>
                        </xsl:for-each>
                                                    <xsl:call-template name="checkElementOutputT">
                                <xsl:with-param name="element" select="w:MinScaleDenominator" />
                                <xsl:with-param name="elementLabel">&wmsinspector.xsl.minscale;:</xsl:with-param>
                            </xsl:call-template>
                                                    <xsl:call-template name="checkElementOutputT">
                                <xsl:with-param name="element" select="w:MaxScaleDenominator" />
                                <xsl:with-param name="elementLabel">&wmsinspector.xsl.maxscale;:</xsl:with-param>
                            </xsl:call-template>
                        <xsl:if test="normalize-space(w:MinScaleDenominator) or normalize-space(w:MaxScaleDenominator)">
                            <tr>
                                <th>&wmsinspector.xsl.scalehint;:</th>
                                <td>
                                    <xsl:value-of select="w:MinScaleDenominator" /> -
                                    <xsl:value-of select="w:MaxScaleDenominator" />
                                </td>
                            </tr>
                        </xsl:if>


                        <xsl:if test="normalize-space(MetadataURL)">
                            <tr>
                                <th>&wmsinspector.xsl.metadata; (<xsl:value-of select="MetadataURL/@type" />):</th>
                                <td>
                                    <a href="{MetadataURL/OnlineResource/@xlink:href}">
                                        <xsl:value-of select="MetadataURL/OnlineResource/@xlink:href" />
                                    </a>
                                </td>
                            </tr>
                        </xsl:if>

                        <xsl:if test="normalize-space(Attribution)">
                            <tr>
                                <th>&wmsinspector.xsl.attribution;</th>
                                <td>
                                    <xsl:choose>
                                        <xsl:when test="Attribution/OnlineResource">
                                            <div>
                                                <a href="{Attribution/OnlineResource/@xlink:href}" >
                                                    <xsl:value-of select="Attribution/Title" />
                                                </a>
                                            </div>
                                        </xsl:when>
                                        <xsl:otherwise>
                                            <div>
                                                <xsl:value-of select="Attribution/Title" />
                                            </div>
                                        </xsl:otherwise>
                                    </xsl:choose>

                                    <xsl:if test="Attribution/LogoURL">
                                        <img src="{Attribution/LogoURL/OnlineResource/@xlink:href}" alt="&wmsinspector.xsl.attribution;" title="&wmsinspector.xsl.attribution;" />
                                    </xsl:if>
                                </td>
                            </tr>
                        </xsl:if>
                    </table>


                </div>
            </td>
        </tr>



        <xsl:for-each select="w:Layer">

            <xsl:call-template name="layerT">
                <xsl:with-param name="layerLevel" select="$layerLevel + 1"/>
            </xsl:call-template>
        </xsl:for-each>

    </xsl:template>


    <xsl:template name="checkElementOutputT">
        <xsl:param name="element" />
        <xsl:param name="elementLabel" />
        <xsl:param name="mandatory" />
        <xsl:param name="outputRow" />
        <xsl:param name="outputLink" />
        <xsl:if test="normalize-space($element) or $outputRow = true()">
            <tr>
                <th><xsl:value-of select="$elementLabel" /></th>
                <td>
                    <xsl:call-template name="checkElementT">
                        <xsl:with-param name="element" select="$element" />
                        <xsl:with-param name="mandatory" select="$mandatory" />
                        <xsl:with-param name="outputLink" select="$outputLink" />
                    </xsl:call-template>
                </td>
            </tr>
        </xsl:if>
    </xsl:template>

    <xsl:template name="checkElementT">
        <xsl:param name="element" />
        <xsl:param name="mandatory" />
        <xsl:param name="outputLink" />
        <xsl:choose>
            <xsl:when test="normalize-space($element)">
                <xsl:choose>
                    <xsl:when test="$outputLink = 'mailto'">
                        <a href="mailto:{$element}">
                            <xsl:value-of select="$element" />
                        </a>
                    </xsl:when>
                    <xsl:when test="$outputLink = true()">
                        <a href="{$element}">
                            <xsl:value-of select="$element" />
                        </a>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="$element" />
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:when>
            <xsl:otherwise>
                <xsl:choose>
                    <xsl:when test="$mandatory = true()">
                        <xsl:call-template name="undefinedMandatoryT" />
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:call-template name="undefined" />
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template name="checkElementBooleanOutputT">
        <xsl:param name="element" />
        <xsl:param name="elementLabel" />
        <xsl:param name="outputRow" />
        <xsl:if test="normalize-space($element) or $outputRow = true()">
            <tr>
                <th><xsl:value-of select="$elementLabel" /></th>
                <td>
                    <xsl:call-template name="checkElementBooleanT">
                        <xsl:with-param name="element" select="$element" />
                    </xsl:call-template>
                </td>
            </tr>
        </xsl:if>
    </xsl:template>

    <xsl:template name="checkElementBooleanT">
        <xsl:param name="element" />
        <xsl:choose>
            <xsl:when test="normalize-space($element) = 1">&wmsinspector.common.yes;</xsl:when>
            <xsl:otherwise>&wmsinspector.common.no;</xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template name="undefined">
        <span class="undefined"> [&wmsinspector.xsl.undefined;] </span>
    </xsl:template>
    <xsl:template name="undefinedMandatoryT">
        <span class="undefined mandatory "> [&wmsinspector.xsl.undefined;] </span>
        <div class="divIcon divIconError" title="&wmsinspector.xsl.mandatoryelement;" />
    </xsl:template>

    <xsl:template match="/">
        <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
                <title>&wmsinspector.xsl.reporttitle; - &wmsinspector.common.name;</title>


                <style type="text/css">
                    <![CDATA[
                    body{
                        font-family: "Georgia", "Garamond","Courier New";
                        margin: 1em 3em;
                        font-size: 0.9em
                    }

                    h1 { font-size: 1.5em; }
                    h2 { font-size: 1.25em; }
                    h2:hover {
                        text-decoration: underline;
                        cursor: pointer
                    }

                    .header {
                        background-repeat: no-repeat;
                        background-position: 0 3px;
                        padding-left: 20px
                    }

                    .collapsed {
                        background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAEdSURBVDjLY/j//z8DJZiB6gY0rH7xpW7li3YKDHj1v2bli38lix61k2VA5fJn/9eeeP+/fcOL/wlT7/aRbEDegkf/Vxx/93/xobf/S5c8/u/ecm0eSQYkTX/4f+HBN/8nbX/xf+bul/8Tp9/9r1N0dgnRBgT33QZqfPW/YdXj/42rH//v2vjkv3fHtf9SScceEWWAc8u1/xO2Pv9fsvjB//IlD4CGPPrvXH/5v2Tksc1EGWBaful/+/on/4sW3gfGxsP/9lUX/ksEH1gj6rqdhSgDlPPO/q9b8fB/5bIH/23LL/wXD9i7kqRAlEo6+b908f3/NiXn/4t57V1EcjRKRB75b1145r+o684FZCUkMb8D/0Uct88euMxEKgYA7Ojrv4CgE7EAAAAASUVORK5CYII=");
                    }

                    .expanded {
                        background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9kLHRMBBsJe0EkAAAE2SURBVDjLY/z//z8DJYCJgUIw8AawwBji/gf/M3GzMDBxsjJw8rAwCHGyMvDxsjAIcLEy8HOyMfBwMjJws7MwsLOwMDAw/PtaHyLOg2LAv8/f56gqi6ZYGQkzcLIyMXCyMzNwskEwBxsTAzsbEwMrIyPD+Yc//zMxMEyG6WNEjgUxt10L1PXF4m2NBBl+/v7PwMTEyMDDzswgxMvKIMjNyvDk3W+Gt59+dXTHylZiNYCBgYFB3HvfInVd4Vh7I0GG37//M3CxMzNICLAx3Hn5i+H1x1/987OUipDVM2JLBxKB+1ZqaAmHORkKMXCyMTFcf/aT4dnbn/N3VGsmoatlxJWQJEMOrtHWEQ7m4GRmePjq+9LLvUYx2NThNEDMbQcLiwj/ekZOBv2ncy3lcEUj42hSptwAAPuRV3c2q1PAAAAAAElFTkSuQmCC");
                    }

                    .divIcon{
                        width: 16px;
                        height: 16px;
                        display: inline-block;
                    }

                    .divIconError{
                        background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAIsSURBVDjLpVNLSJQBEP7+h6uu62vLVAJDW1KQTMrINQ1vPQzq1GOpa9EppGOHLh0kCEKL7JBEhVCHihAsESyJiE4FWShGRmauu7KYiv6Pma+DGoFrBQ7MzGFmPr5vmDFIYj1mr1WYfrHPovA9VVOqbC7e/1rS9ZlrAVDYHig5WB0oPtBI0TNrUiC5yhP9jeF4X8NPcWfopoY48XT39PjjXeF0vWkZqOjd7LJYrmGasHPCCJbHwhS9/F8M4s8baid764Xi0Ilfp5voorpJfn2wwx/r3l77TwZUvR+qajXVn8PnvocYfXYH6k2ioOaCpaIdf11ivDcayyiMVudsOYqFb60gARJYHG9DbqQFmSVNjaO3K2NpAeK90ZCqtgcrjkP9aUCXp0moetDFEeRXnYCKXhm+uTW0CkBFu4JlxzZkFlbASz4CQGQVBFeEwZm8geyiMuRVntzsL3oXV+YMkvjRsydC1U+lhwZsWXgHb+oWVAEzIwvzyVlk5igsi7DymmHlHsFQR50rjl+981Jy1Fw6Gu0ObTtnU+cgs28AKgDiy+Awpj5OACBAhZ/qh2HOo6i+NeA73jUAML4/qWux8mt6NjW1w599CS9xb0mSEqQBEDAtwqALUmBaG5FV3oYPnTHMjAwetlWksyByaukxQg2wQ9FlccaK/OXA3/uAEUDp3rNIDQ1ctSk6kHh1/jRFoaL4M4snEMeD73gQx4M4PsT1IZ5AfYH68tZY7zv/ApRMY9mnuVMvAAAAAElFTkSuQmCC");
                    }

                    .divSection{ margin-left: 1em; }

                    .divSubSection{ margin-left: 1em; }

                    #tableLayers{ width: 100%; }

                    .divLayer{
                        margin: 0.5em 1em 0 1em;
                        clear:both;
                    }

                    .headerLayer{
                        cursor:pointer;
                        padding-top: 3px;
                        padding-bottom: 3px;
                    }

                    .headerLayer:hover{
                        text-decoration: underline;
                    }

                    .divLegend{
                        width: 20%;
                        display:inline;
                        float: left;
                    }

                    .tableDetails tr{
                        background-color: #eee !important;
                    }
                    .spanMethod{
                        text-transform: uppercase;
                        padding-right: 10px;
                    }

                    table{
                        border-collapse: collapse;
                    }

                    table td{
                        padding: 2px 20px 2px 10px;
                        vertical-align: top
                    }
                    table th{
                        padding: 2px 20px 2px 10px;
                        vertical-align: top
                    }

                    tr:nth-child(odd) { background-color:#eee; }
                    tr:nth-child(even) { background-color:#FFFFCC; }

                    th { text-align: left; }

                    .thLayerName { text-align: center; }

                    .imgHeader{ vertical-align: middle; }

                    .imgHeaderMap{
                        float:right;
                        margin-top: 2px;
                        margin-right: 2px;
                    }

                    .mandatory{ color: red !important; }

                    .undefined{
                        font-size: 0.8em;
                        font-style: italic;
                        color: gray
                    }

                    #footer{
                        font-size: 0.7em;
                        margin-top: 4em;
                        border-top: 1px solid #EEEEEE;
                        text-align: center;
                    }
                    ]]>

                </style>
            </head>
            <body>

                <xsl:apply-templates  />


                <div id="footer">
                    &wmsinspector.xsl.generatedby; &wmsinspector.common.name;
                </div>


                <script type="text/javascript">
                    <xsl:comment>
                        <![CDATA[
                            var headers = document.getElementsByTagName("h2");
                            registerEvents(headers);

                            var divs = document.getElementById("divLayers").getElementsByTagName("div");
                            for (var i = 0; i < divs.length; i++){
                                if (divs[i].className.indexOf("header") !== -1)
                                    divs[i].addEventListener("click", toggleDiv, false);
                            }

                            function registerEvents(elements){
                                for (var i = 0; i < elements.length; i++){
                                    elements[i].addEventListener("click", toggleDiv, false);
                                }
                            }

                            function toggleDiv(e){
                                var header = e.currentTarget;
                                var div = document.getElementById(header.id.replace(/header/,"div"));
                                if (div){
                                    var expand = (div.style.display == "none");
                                    div.style.display = (expand) ? "block" : "none";
                                    var from = (expand) ? "collapsed" : "expanded";
                                    var to = (expand) ? "expanded" : "collapsed";
                                    var re = new RegExp(from,"g");
                                    header.className = header.className.replace(re,to);
                                }
                            }
                        ]]>
                    </xsl:comment>
                </script>
            </body>
        </html>
    </xsl:template>
</xsl:stylesheet>
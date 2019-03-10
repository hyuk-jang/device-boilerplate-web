var input_title = new Array(100);
lan=getCookie("lan");
function loadlanguage()
{
	var tran = document.getElementsByTagName("span");
	for (var i = 0; i < tran.length; i++)
	{	
		if (tran[i].title == "symbol")
		{
			tran[i].innerHTML = translator(tran[i].innerHTML);
			tran[i].title = "";
		}
	}
	
	var opt = document.getElementsByTagName("option");
	for (var i = 0; i < opt.length; i++)
	{	
		if (opt[i].title == "symbol")
		{
			opt[i].text = translator(opt[i].text);
			opt[i].title = "";
		}
	}
	
	var input = document.getElementsByTagName("input");
	for (var i = 0; i < input.length; i++)
	{	
		if((input[i].type == "button" || input[i].type == "submit") && input[i].title == "symbol")
		{
			input[i].value = translator(input[i].value);
			input[i].title = "";
		}
	}
}

function loadvalue_MultiLangList()
{
	var input=document.getElementsByTagName("select");
	if(custom_translator_ok) 
		langCount = eval(system_info_language_count)+ eval(system_info_customlanguage_count) ;
	else
		langCount = eval(system_info_language_count);
	
	for (var i = 0; i < input.length; i++)
	{
		title = input[i].title.split(",");

		if(title[0]=="parameter")
		{
			for (j = 0; j < langCount; j ++)
			{			
				eval("value="+input[i].options[j].text);
				//eval("value="+input[i].options[j].innerHTML);
				input[i].options[j].text = value;
				input[i].options[j].text = unescape(input[i].options[j].text);
			}						
		}		
	}
}

function loadvalue()
{
	var input=document.getElementsByTagName("input");
	for (var i = 0; i < input.length; i++)
	{
		input_title[i]=input[i].title;
		title = input[i].title.split(",");
		if(title[0]=="param")
		{			
			if(input[i].type=="text" || input[i].type=="password")
				eval("input["+i+"].value="+input[i].name);
			else if(input[i].type=="hidden")
			{
				eval("input["+i+"].value="+input[i].name);
				if(eval("typeof(input["+(i+1)+"])")!="undefined")
				{
					if(input[i+1].type=="checkbox")
					{
						if(input[i].value=="0")
							input[i+1].checked=0;
						else
							input[i+1].checked=1;
					}
				}
			}
			else if(input[i].type=="radio")
			{
				eval("value="+input[i].name);
				if (input[i].value == value)
				{
					input[i].checked = true;
				}
			}
			input[i].title="";
		}
		else if(title[0]=="param_chk")
		{
			input[i].title="";
		}
	}
	
	var input=document.getElementsByTagName("select");
	for (var i = 0; i < input.length; i++)
	{
		title = input[i].title.split(",");
		if(title[0]=="param")
		{
			eval("value="+input[i].name);
			for (j = 0; j < input[i].length; j ++)
			{			
				if (input[i].options[j].value == value)
				{
					input[i].options[j].selected = true;
					break;
				}
			}
			input[i].title="";
		}
	}

	var input=document.getElementsByTagName("span");
	for (var i = 0; i < input.length; i++)
	{	
		title = input[i].title.split(",");
		if(title[0]=="param")
		{
			if(eval("typeof("+input[i].innerHTML+")")!="undefined")
			{
				eval("value="+input[i].innerHTML);
				input[i].innerHTML=value;
				input[i].innerHTML=unescape(input[i].innerHTML);
			}
			input[i].title="";
		}
	}
	return 0;
}

var initalFlag = 0;
function receiveparam()
{	
	if (XMLHttpRequestObject.readyState == 4 && XMLHttpRequestObject.status == 200)
	{
		eval(XMLHttpRequestObject.responseText);
		if(typeof(receivedone)=="function")
			receivedone();
		loadvalue();
		if(typeof(loadvaluedone)=="function")
			loadvaluedone();

	}
	
	if(initalFlag == "0" && document.getElementById("logo") != null) /*for Configuration Page round corner effect*/
	{
			updateLogoInfo();
			resizeLogo();
			
			Nifty("div#outter-wrapper","small","nonShadow");		
			Nifty("div#case","normal","nonShadow");
			document.getElementsByTagName("b")[5].style.position = "relative";
			
			initalFlag = "1";
	}			
	
}

function updatecheck(inputName, checkbox)
{
	if (checkbox.checked)
		inputName.value = "1";
	else
		inputName.value = "0";
}

function updatecheckById(Id, checkbox)
{
	if (checkbox.checked)
		document.getElementById(Id).value = "1";
	else
		document.getElementById(Id).value = "0";
}


function checkInString(instr){
	for (i = 0; i < instr.value.length; i++){
        c = instr.value.charAt(i);
        if (c == '"' || c == '\'' || c == '<' || c == '>' || c == '&')
        {          alert(translator("you_have_used_invalid_characters_sh"));
          instr.focus();
          instr.select();
          return -1;
        }
    }

   return 0;
}

function checkInString2(instr){
	for (i = 0; i < instr.value.length; i++){
        c = instr.value.charAt(i);
        if (c == '"' || c == '\'' || c == '<' || c == '>' || c == '=' || c == '&')
        {
          alert(translator("you_have_used_invalid_characters_host"));
          instr.focus();
          instr.select();
          return -1;
        }
    }

   return 0;
}

function checkFilenameString(instr){
  for (i = 0; i < instr.value.length; i++){
    c = instr.value.charAt(i);
    if (c == '"' || c == '\'' || c == '<' || c == '>' || c == '/' || c == ':' || c == '*' || c == '.' || c == '?' || c == '|' || c == '\\' || c == '&')
    {
       alert(translator("you_have_used_invalid_characters_lg"));
       instr.focus();
       instr.select();
       return -1;
    }
  }
  return 0;
}

function checkInSpace(instr){
	for (i = 0; i < instr.value.length; i++){
        c = instr.value.charAt(i);
        if (c == ' ')
        {
          alert(translator("space_is_invalid"));
          instr.focus();
          instr.select();
          return -1;
        }
    }

   return 0;
}

function checkIPaddr(input)
{
   var filter=/^((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){3}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})$/;
   if (!filter.test(input.value) || (!input.disabled && input.value == "0.0.0.0"))
    {
       alert(translator("please_enter_a_valid_ip_address"));
       input.focus();
       input.select();
       return -1;
   }
   return 0;
}

/*
function checkIPaddr(input)
{
	var filter=/\d+\.\d+\.\d+\.\d+/;
	if (!filter.test(input.value)){
		alert(translator("please_enter_a_valid_ip_address"));
		input.focus();
		input.select();
		return -1;
	}
	input.value = input.value.match(filter)[0];
	subip = input.value.split(".");
	for (i = 0; i < subip.length; i ++)
	{
		if ((parseInt(subip[i]) > 255) || (parseInt(subip[i]) < 0 ))
		{
			alert(translator("please_enter_a_valid_ip_address"));
			input.focus();
			input.select();
			return -1;
		}
	}	
	if (!input.disabled && (parseInt(subip[0]) == 0) && (parseInt(subip[1]) == 0) && (parseInt(subip[2]) == 0) && (parseInt(subip[3]) == 0))
	{
		alert(translator("please_enter_a_valid_ip_address"));
		input.focus();
		input.select();
		return -1;
	}
	
	return 0;
}
*/

function checkIP6(input)
{
	var filter=[
		/^(?:[a-f0-9]{1,4}:){7}[a-f0-9]{1,4}$/i,
		/^[a-f0-9]{0,4}::$/i,
		/^:(?::[a-f0-9]{1,4}){1,6}$/i,
		/^(?:[a-f0-9]{1,4}:){1,6}:$/i,
		/^(?:[a-f0-9]{1,4}:)(?::[a-f0-9]{1,4}){1,6}$/i,
		/^(?:[a-f0-9]{1,4}:){2}(?::[a-f0-9]{1,4}){1,5}$/i,
		/^(?:[a-f0-9]{1,4}:){3}(?::[a-f0-9]{1,4}){1,4}$/i,
		/^(?:[a-f0-9]{1,4}:){4}(?::[a-f0-9]{1,4}){1,3}$/i,
		/^(?:[a-f0-9]{1,4}:){5}(?::[a-f0-9]{1,4}){1,2}$/i,
		/^(?:[a-f0-9]{1,4}:){6}(?::[a-f0-9]{1,4})$/i
			];
	for (var i=0; i<filter.length; i++)
	{
		if (filter[i].test(input.value))
		{
			return 0;
		}
	}
	return -1;
}

function checkIP6_4(input)
{
	var filter=[
		/^(?:[a-f0-9]{1,4}:){6}(?:\d{1,3}\.){3}\d{1,3}$/i,
		/^:(?::[a-f0-9]{1,4}){0,4}:(?:\d{1,3}\.){3}\d{1,3}$/i,
		/^(?:[a-f0-9]{1,4}:){1,5}:(?:\d{1,3}\.){3}\d{1,3}$/i,
		/^(?:[a-f0-9]{1,4}:)(?::[a-f0-9]{1,4}){1,4}:(?:\d{1,3}\.){3}\d{1,3}$/i,
		/^(?:[a-f0-9]{1,4}:){2}(?::[a-f0-9]{1,4}){1,3}:(?:\d{1,3}\.){3}\d{1,3}$/i,
		/^(?:[a-f0-9]{1,4}:){3}(?::[a-f0-9]{1,4}){1,2}:(?:\d{1,3}\.){3}\d{1,3}$/i,
		/^(?:[a-f0-9]{1,4}:){4}(?::[a-f0-9]{1,4}):(?:\d{1,3}\.){3}\d{1,3}$/i
			];
	for (var i=0; i<filter.length; i++)
	{
		if (filter[i].test(input.value))
		{
			return 0;
		}
	}
	return -1;
}

function checkIP6_linkLocal(input)
{
	var filter=/^fe(?:[a-b8-9]{1}[a-f0-9]{1}):/i;
	if(checkIP6(input) || !filter.test(input.value))
	{
		alert(translator("please_enter_a_valid_ip_address"));
		input.focus();
		input.select();
		return -1;
	}
		return 0;
}

function checkIPtable6(input)
{
	if(checkIP6(input))
	{
		alert(translator("please_enter_a_valid_ip_address"));
		input.focus();
		input.select();
		return -1;
	}
	return 0;
}

function checkIPtableAdmin(input)
{
	if(checkIP6(input))
	{
		if(checkIPaddr(input))
		{
			input.focus();
			input.select();
			return -1;
		}
	}
	return 0;
}

function checkIPaddr6(input)
{
	var f1=/^ff(?:[a-f0-9]{2}):/i;//Multicast
	var f2=/^2002:/i;//6to4Tunnel
	var f3=/^fe(?:[a-b8-9]{1}[a-f0-9]{1}):/i;//LinkLocal
	// can't use Multicast, 6to4Tunnel and LinkLocal
	if((checkIP6(input) || f1.test(input.value) || f2.test(input.value) || f3.test(input.value)) && checkIP6_4(input))
	{
		alert(translator("please_enter_a_valid_ip_address"));
		input.focus();
		input.select();
		return -1;
	}
	return 0;
}

function checkWinsIPaddr(input)
{
	// Wins IP addr can only be empty or match IP addr rule
	if(input.value != "")
	{
		if(checkIPaddr(input))
			return -1;
	}
	return 0;
}

function checkMultiCastIPaddr(input)
{
	var filter=/\d+\.\d+\.\d+\.\d+/;
	if (!filter.test(input.value)){
		alert(translator("please_enter_a_valid_ip_address"));
		input.focus();
		input.select();
		return -1;
	}
	input.value = input.value.match(filter)[0];
	subip = input.value.split(".");
	if ((parseInt(subip[0]) > 239) || (parseInt(subip[0]) < 224 ))
	{
			alert(translator("please_enter_a_valid_ip_address"));
			input.focus();
			input.select();
			return -1;
	}
	for (i = 1; i < subip.length; i ++)
	{
		if ((parseInt(subip[i]) > 255) || (parseInt(subip[i]) < 0 ))
		{
			alert(translator("please_enter_a_valid_ip_address"));
			input.focus();
			input.select();
			return -1;
		}
	}	
	return 0;
}

function checkPort(thisObj)
{
	switch(thisObj.name)
	{
		case "network_http_port":
			defaultPort=80;
			message="http_port_must_be_80_or_from_1025_to_65535";
			break;
		case "network_http_alternateport":
			defaultPort=8080;
			message="secondary_http_port_must_be_from_1025_to_65535";
			break;
		case "network_ftp_port":
			defaultPort=21;
			message="ftp_port_must_be_21_or_from_1025_to_65535";
			break;
		case "network_rtsp_port":
			defaultPort=554;
			message="rtsp_port_must_be_554_or_from_1025_to_65535";
			break;	
		case "network_rtp_videoport":
			defaultPort=5556;
			message="rtp_video_port_must_be_from_1025_to_65535";
			break;	
		case "network_rtp_audioport":
			defaultPort=5558;
			message="rtp_audio_port_must_be_from_1025_to_65535";
			break;	
		case "network_rtsp_s0_multicast_videoport":
			defaultPort=5556;
			message="rtsp_s0_multicast_video_port_must_be_from_1025_to_65535";
			break;		
		case "network_rtsp_s0_multicast_audioport":
			defaultPort=5558;
			message="rtsp_s0_multicast_audio_port_must_be_from_1025_to_65535";
			break;	
		case "network_rtsp_s1_multicast_videoport":
			defaultPort=5556;
			message="rtsp_s1_multicast_video_port_must_be_from_1025_to_65535";
			break;	
		case "network_rtsp_s1_multicast_audioport":
			defaultPort=5558;
			message="rtsp_s1_multicast_audio_port_must_be_from_1025_to_65535";
			break;
		case "syslog_serverport":
			defaultPort=514;
			message="syslog_server_port_must_be_514_or_from_1025_to_65535";
			break;
		case "network_sip_port":
			defaultPort=5060;
			message="two_way_audio_port_must_be_from_1025_to_65535";
			break;
		case "network_https_port":
			defaultPort=443;
			message="https_port_must_be_443_or_from_1025_to_65535";
			break;
	}
	if (thisObj.value == defaultPort)
		return 0;
	if ((thisObj.value > 1024) && (thisObj.value <= 65535))
		return 0;
	alert(translator(message));
	thisObj.select();
	thisObj.focus();
	return -1;
}

function checkPassword(Pass1, Pass2)
{
    var vPass1 = Pass1.value;
    var vPass2 = Pass2.value;

    for (i = 0; i < vPass1.length; i++){
        c = vPass1.charAt(i);
        if (!( (c>='@' && c<='Z') || (c>='a' && c<='z') || (c>='0' && c<='9') || c=="!" ||
               c=="$" || c=="%" || c=="-" || c=="." || c=="^" || c=="_" || c=="~"))
        {
          alert(translator("you_have_used_invalid_characters_passwd"));
          Pass1.focus();
          Pass1.select();
          return -1;
        }
    }

    if (vPass1 != vPass2){
        alert(translator("the_confirm_password_differs_from_the_password"));
        Pass1.focus();
        Pass1.select();
        return -1;
    }
    return 0;
}

function checkemail(input)
{
	var filter=/^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
	if (filter.test(input.value))
		return 0;
	else{
		alert(translator("please_input_a_valid_email_address"));
		input.focus();
		input.select();
		return -1;
	}
}

function checkNumRange(thisObj, up, down)
{
	if ((thisObj.value >= down) && (thisObj.value <= up) && parseInt(thisObj.value,10)==parseFloat(thisObj.value))
		return 0;
	alert(translator("please_input_a_valid_value") + "[" + down + " ~ " + up + "]");
	thisObj.select();
	thisObj.focus();
	return -1;
}

function checkHHMM(input)
{
	var filter=/\d\d:\d\d/;
	if (!filter.test(input.value))
	{
		alert(translator("please_enter_a_valid_time"));
		input.focus();
		input.select();
		return -1;
	}
	input.value = input.value.match(filter)[0];
	sub_item = input.value.split(":");
	if (((parseInt(sub_item[0], 10) >= 24) || (parseInt(sub_item[1], 10) >= 60)) && ((parseInt(sub_item[0], 10) != 24) || (parseInt(sub_item[1], 10) != 00)))
	{
		alert(translator("please_enter_a_valid_time"));
		input.focus();
		input.select();
		return -1;
	}
	
	return 0;
}

function checkStringSize(input)
{
	len=0;
	for(i=0; (i<input.value.length) && (len<input.maxLength); i++)
		if(input.value.charCodeAt(i)<0x80)
			len+=1;
		else if(input.value.charCodeAt(i)<0x800)
			len+=2;
		else if(input.value.charCodeAt(i)<0x10000)
			len+=3;
		else if(input.value.charCodeAt(i)<0x200000)
			len+=4;
		else if(input.value.charCodeAt(i)<0x4000000)
			len+=5;
		else
			len+=6;
	if(len>input.maxLength)
		i--;
	input.value=input.value.substring(0,i);
}

function checkAccessName (input)
{
	if (!/^[0-9a-zA-Z_\-\.]+$/.test(input.value))
	{
		alert(translator("accessname_can_only_contains_numeric_alpha"));
		input.focus();
		input.select();
		return -1;
	}
	return 0;
}

function checkvalue()
{
	var input=document.getElementsByTagName("input");
	for (var i = 0; i < input.length; i++)
	{	
		title = input_title[i].split(",");
		if(title[0]=="param" || title[0]=="param_chk")
		{
			if(input[i].type=="text" || input[i].type=="password")
			{
				if(title[1]=="string")
				{
					checkStringSize(input[i]);
					if(checkInString(input[i]))
						return -1;
					if(title[2]=="empty")
						if(CheckEmptyString(input[i]))
							return -1;	
					if(title[2]=="space")
					{
						if(checkInSpace(input[i]))
							return -1;
					}
					else if (title[2]=="accessname")
					{
						if (checkAccessName(input[i]))
							return -1;
					}

				}
				else if(title[1]=="string2")
				{
					checkStringSize(input[i]);
					if(checkInString2(input[i]))
						return -1;					
				}
				else if(title[1]=="num")
				{
					if(checkNumRange(input[i], parseInt(title[2]), parseInt(title[3])))
						return -1;
				}
				else if(title[1]=="port")
				{
					if(checkPort(input[i]))
						return -1;
				}				
				else if(input[i].value=="")
				{
					continue;
				}
				else if(title[1]=="filename")
				{
					if(checkFilenameString(input[i]))
						return -1;
				}
				else if(title[1]=="ipaddr")
				{
					if(checkIPaddr(input[i]))
						return -1;
				}
				else if(title[1]=="ipaddr6")
				{
					if(checkIPaddr6(input[i]))
						return -1;
				}
				else if(title[1]=="ipaddr6router")
				{
					if(checkIP6_linkLocal(input[i]))
						return -1;
				}
				else if(title[1]=="iptable6")
				{
					if(checkIPtable6(input[i]))
						return -1;
				}
				else if(title[1]=="iptableadmin")
				{
					if(checkIPtableAdmin(input[i]))
						return -1;
				}
				else if(title[1]=="winsipaddr")
				{
					if(checkWinsIPaddr(input[i]))
						return -1;
				}
				else if(title[1]=="multicastipaddr")
				{
					if(checkMultiCastIPaddr(input[i]))
						return -1;
				}
				else if(title[1]=="email")
				{
					if(checkemail(input[i]))
						return -1;
				}
				else if(title[1]=="time")
				{
					if(checkHHMM(input[i]))
						return -1;
				}
				else if(title[1]=="completetime")
				{
					if(checkHHMMSS(input[i]))
						return -1;
				}
				else if(title[1]=="date")
				{
					if(checkYYYYMMDD(input[i]))
						return -1;
				}
			}
		}
	}
	return 0;
}

function getCookie(Name) 
{
  var search = Name + "=";
  if (document.cookie.length > 0) { 
      // if there are any cookies
      offset = document.cookie.indexOf(search);
      if (offset != -1) { 
          // if cookie exists
          offset += search.length;

          // set index of beginning of value
          end = document.cookie.indexOf(";", offset);

          // set index of end of cookie value
          if (end == -1)
              end = document.cookie.length;

          return unescape(document.cookie.substring(offset, end));
      }
  }
  return 0;
}

function setCookie(name, value, expire) 
{
	strCookie = name + "=" + escape(value);
	if (expire)
	    strCookie += "; expires=" + expire.toGMTString();
	
  document.cookie = strCookie;
}

function translator(str)
{
	var textNode;
	if (lan == 100)
	{
		textNode = xmlDoc.getElementsByTagName(str)[0].childNodes[0];
	}
	else
	{
		textNode = xmlDoc.getElementsByTagName(str)[lan].childNodes[0];
	}
	
	if (textNode != undefined)
	{
		return textNode.nodeValue;
	}
	else
	{	
		return "";
	}
}

function updateDynSelOpt(x, aList)
{
	var cnt;

	cnt = 0;
	for (i = 0; i < aList.length; i ++) {

		if (aList[i][0])	cnt ++;
	}
	
	if (cnt != 0) {
		x.length = cnt;
		j = 0;
		for (i = 0; i < aList.length; i ++) {
			if (aList[i][0]) {
				x.options[j].text = aList[i][1];
				x.options[j].value = aList[i][2];
				j ++;
			}
		}
	}
	
	return cnt;
}

function showimage(type)
{
	var platform;
	platform = navigator.platform.substr(0,3);
	if ((navigator.appName == "Microsoft Internet Explorer") && (platform == "Win"))
	{
		switch (type)
		{
		case '0':
			W=W + X_OFFSET;
			H=H + Y_OFFSET;
			break;
		case '1':
		case '3':
			W=BaseWidth + X_OFFSET_MD;
			H=BaseHeight + Y_OFFSET_MD;
			STRETCH = "true";
			break;
		case '2':
			W=BaseWidth + X_OFFSET;
			H=BaseHeight + Y_OFFSET;
			STRETCH = "true";
		case '4':
			W = 320 + X_OFFSET;
			H = 240 + Y_OFFSET;
			STRETCH = "true";
			break;				
		}
		// The ActiveX plug-in	
		document.write("<object id=\"" + PLUGIN_ID + "\" width=" + W + " height=" + H);
		document.write(" standby=\"Loading plug-in...\" classid=CLSID:" + CLASS_ID);
		document.write(" codebase=\"/" + PLUGIN_NAME + "#version=" + PLUGIN_VER + "\">");

		var Instr = location.hostname;
		var i = Instr.indexOf(":");
		if (codectype=="mpeg4")
		{
			if (i > 0)
			{
				document.write("<param name=\"Url\" VALUE=\"rtsp://" + "[" + location.hostname + "]" + "/" + AccessName +"\">");
			}
			else if (i == -1)
			{
				document.write("<param name=\"Url\" VALUE=\"rtsp://" + location.hostname + "/" + AccessName +"\">");
			}
		}
		else
		{
			thisURL = document.URL;  
			http_method = thisURL.split(":");

			if (http_method[0] == "https")
			{
				if (i > 0)
				{
					document.write("<param name=\"Url\" VALUE=\"https://" + "[" + location.hostname + "]:" + location.port + "/" + AccessName +"\">");
				}
				else
				{
					document.write("<param name=\"Url\" VALUE=\"https://" + location.host + "/" + AccessName +"\">");
				}
			}
			else
			{
				if (i > 0)
				{
					document.write("<param name=\"Url\" VALUE=\"http://" + "[" + location.hostname + "]:" + location.port + "/" + AccessName +"\">");
				}
        			else
        			{
					document.write("<param name=\"Url\" VALUE=\"http://" + location.host + "/" + AccessName +"\">");
				}
			}
			//document.write("<param name=\"ServerModelType\" VALUE=\"0\">");
		}
		
		switch (type)
		{
		case '0':
			document.write("<PARAM NAME=\"ControlType\" VALUE=0>");
			document.write("<param name=\"ClientOptions\" VALUE=\"639\">");
			// user == (null), means no set root password
			// privilege 1: viewer, 4: operator, 6: admin
			if ((user=="(null)")||(privilege=="4")||(privilege=="6")) 
			{
				document.write("<PARAM NAME=\"EnableTwoWayAudio\" VALUE=\"true\">");
				document.write("<PARAM NAME=\"EnableMuteWhenTalk\" VALUE=\"true\">");
			}
			break;
		case '1':
			document.write("<PARAM NAME=\"ControlType\" VALUE=2>");
			document.write("<PARAM NAME=\"EnableMD\" VALUE=\"true\">");
			document.write("<PARAM NAME=\"GetMD\" VALUE=\"/cgi-bin/admin/getmd.cgi\">");
			document.write("<PARAM NAME=\"SetMD\" VALUE=\"/cgi-bin/admin/setmd.cgi\">");
			document.write("<PARAM NAME=\"ClientOptions\" VALUE=\"639\">");	
			break;
		case '2':
			document.write("<PARAM NAME=\"ControlType\" VALUE=0>");
			document.write("<PARAM NAME=\"ClientOptions\" VALUE=\"639\">");	
			break;
		case '3':
			document.write("<PARAM NAME=\"ControlType\" VALUE=4>");
			document.write("<PARAM NAME=\"EightTimesInMaskPosSize\" VALUE=\"true\">");
			document.write("<PARAM NAME=\"GetMaskEditParmUrl\" VALUE=\"/cgi-bin/admin/getpm.cgi\">");
			document.write("<PARAM NAME=\"SetMaskEditParmUrl\" VALUE=\"/cgi-bin/admin/setpm.cgi\">");
			document.write("<PARAM NAME=\"ClientOptions\" VALUE=\"639\">");	
			break;
		case '4':
			document.write("<PARAM NAME=\"ControlType\" VALUE=0>");
			document.write("<PARAM NAME=\"ClientOptions\" VALUE=\"639\">");
			break;						
		}
		document.write("<param name=\"ViewStream\" VALUE=\"" + streamsource + "\">");
		document.write("<param name=\"VSize\" VALUE=\"CMS\">");
		document.write("<param name=\"Stretch\" VALUE=\"" + STRETCH + "\">");
		
		// Support Joystick
		document.write("<PARAM NAME=\"EnableJoystick\" VALUE=\"true\">");
	    document.write("<PARAM NAME=\"UpdateJoystickInterval\" VALUE=\"100\">");
		document.write("<PARAM NAME=\"JoystickSpeedLvs\" VALUE=\"5\">");
		document.write("<PARAM NAME=\"BeRightClickEventHandler\" VALUE=\"true\">");
		document.write("<PARAM NAME=\"PtzURL\" VALUE=\"/cgi-bin/camctrl/camctrl.cgi\">");
		document.write("<PARAM NAME=\"RecallURL\" VALUE=\"/cgi-bin/camctrl/recall.cgi\">");
		document.write("<param name=\"Language\" VALUE=\"" + PLUGIN_LANG + "\">");
		document.write("<param name=\"MP4Conversion\" VALUE=\"true\">");
		document.write("<param name=\"EnableFullScreen\" VALUE=\"true\">");
		document.write("<param name=\"AutoStartConnection\" VALUE=\"false\">");
		document.write("<param name=\"ClickEventHandler\" VALUE=\"3\">");
		document.write(translator("this_is_a_plugin_activex") + " ");
        document.write(translator("if_you_see_this_text_your_browser_does_not_support_or_has_disabled_activex"));
        document.write("<p/></object>");
	}
	else if (navigator.appName == "Netscape")
	{		
		if (codectype=="mjpeg")
		{
			if (type!=0)
			{
				Width=BaseWidth;
				Height=BaseHeight;
			}
			
			thisURL = document.URL;  
			http_method = thisURL.split(":");
			if (http_method[0] == "https")
			{
				document.write("<img src=\"https://" + location.host + "/" + AccessName + "\" width=\"" +Width+ "\" height=\"" +Height+"\"/>");
			}
			else
			{
				document.write("<img src=\"http://" + location.host + "/" + AccessName + "\" width=\"" +Width+ "\" height=\"" +Height+"\"/>");
			}
		}
		else
		{
			if (type!=0)
			{
				Width=BaseWidth;
				Height=BaseHeight + 16;
			}
			
			document.write("<embed SCALE=\"ToFit\" width=\"" + Width + "\" height=\"" + Height + "\"");
			document.write(" type=\"video/quicktime\" qtsrc=\"rtsp://" + location.hostname + "/" + AccessName + "\"");
			document.write(" qtsrcdontusebrowser src=\"/realqt.mov\" autoplay=\"true\" controller=\"true\"\>");
		}
	}
	else
	{
		document.write("Please use Firefox, Mozilla or Netscape<br>");
	}

	if((navigator.appName == "Microsoft Internet Explorer") && (platform == "Win"))
	{
		var plugin = document.getElementById(PLUGIN_ID);
		var pluginParent = plugin.parentElement;
		var redrawButton = document.createElement("div");
		redrawButton.innerHTML = '<input style="display: none" id="redrawPlugin" type="button" onclick="RtspVapgCtrl.RedrawIE()"/>';
		pluginParent.insertBefore(redrawButton, plugin.nextSibling);
	}

}

function openurl(url, resizable)
{
	var subWindow = window.open(url, "","width=600, height=500, scrollbars=yes, status=yes,resizable=" + (resizable == undefined ? "no" : resizable));
	subWindow.focus();
}

function countdown()
{
	var board = document.getElementById("progress_bar");
	count --;
	if (count < 0)
	{
		parent.window.location = newlocation;
	}
	else
	{
		board.value = board.value + "|";
		setTimeout("countdown()", intervel);
	}
}

function showNotification(wait_time)
{
	newlocation = "http://" + network_ipaddress + ":" + network_http_port + "/";

	document.getElementById("notification").style.display = "block";
	document.getElementById("notify_location").innerHTML = newlocation;
	count = 100;
	intervel = wait_time * 1000 / count;
	countdown();
}


function SetPluginString(obj)
{
    var i;
    var vMLCodePage = translator("vmlcodepage");
    var vMLFontSize = translator("vmlfontsize");
    var vMLCharSet = translator("vmlcharset");
    var vMLPitch = translator("vmlpitch");
    var vMLSwiss = translator("vmlswiss");
    var vMLFontName = translator("vmlfontname");
    var avMLLangStr = new Array(121);
    
    avMLLangStr[0] = translator("fail_to_connect_server");
    avMLLangStr[1] = translator("zoom");
    avMLLangStr[2] = translator("hide");
    avMLLangStr[3] = translator("media_option");
    avMLLangStr[4] = translator("protocol_option");
    avMLLangStr[5] = translator("the_auto_detection_order_of_transimission_protocol_is_udp_tcp_http");
    avMLLangStr[6] = translator("http_video_only");
    avMLLangStr[7] = translator("tcp");
    avMLLangStr[8] = translator("error");
    avMLLangStr[9] = translator("the_downstream_audio_connection_for_the_current_user_is_not_authorized");
    avMLLangStr[10] = translator("the_media_type_has_been_changed_to_video_only_because_audio_connection");
    avMLLangStr[11] = translator("the_connection_is_closed_because_downstream_audio_connection_is_not_authorized_for_downstream_audio");
    avMLLangStr[12] = translator("the_connection_is_closed_because_server_audio_mode_is_set_to");
    avMLLangStr[13] = translator("the_upstream_channel_is_occupied_please_try_later");
    avMLLangStr[14] = translator("connections_already_exceed_the_limit");
    avMLLangStr[15] = translator("full_duplex");
    avMLLangStr[16] = translator("half_duplex");
    avMLLangStr[17] = translator("talk_only");
    avMLLangStr[18] = translator("listen_only");
    avMLLangStr[19] = translator("audio_disabled");
    avMLLangStr[20] = translator("a_disabled");
    avMLLangStr[21] = translator("audio_only");
    avMLLangStr[22] = translator("no_sound_card");
    avMLLangStr[23] = translator("could_not_initialize_audio_capture_device");
    avMLLangStr[24] = translator("the_upstream_audio_connection_is_not_allowed");
    avMLLangStr[25] = translator("the_downstream_audio_connection_is_not_allowed");
    avMLLangStr[26] = translator("the_media_type_has_been_changed_to_video_only_because_the_audio_mode_is_set_to");
    avMLLangStr[27] = translator("talk");
    avMLLangStr[28] = translator("stop_talk");
    avMLLangStr[29] = translator("the_downstream_audio_connection_is_not_allowed_because_the_media_from_server_contains_no_audio");
    avMLLangStr[30] = translator("the_media_type_has_been_changed_to_video_only_because_the_media_from_server_contains_no_audio");
    avMLLangStr[31] = translator("play");
    avMLLangStr[32] = translator("pause");
    avMLLangStr[33] = translator("resume");
    avMLLangStr[34] = translator("stop");
    avMLLangStr[35] = translator("buffering");
    avMLLangStr[36] = translator("because_the_network_environment_problem_transmission_mode_changes_to_unicast");
    avMLLangStr[37] = translator("because_the_network_environment_problem_transmission_protocol_changes_to_tcp");
    avMLLangStr[38] = translator("please_insert_window_names_on_all_windows");
    avMLLangStr[39] = translator("motion_detection");
    avMLLangStr[40] = translator("connection_is_closed");
    avMLLangStr[41] = translator("save_window_completed");
    avMLLangStr[42] = translator("save_window_failed");
    avMLLangStr[43] = translator("please_close_all_warning_window_first");
    avMLLangStr[44] = translator("because_the_connection_problem_of_network_environment");
    avMLLangStr[45] = translator("warning");
    avMLLangStr[46] = translator("window_name");
    avMLLangStr[47] = translator("sensitivity");
    avMLLangStr[48] = translator("percentage");
    avMLLangStr[49] = translator("new");
    avMLLangStr[50] = translator("save");
    avMLLangStr[51] = translator("disable_digital_zoom");
    avMLLangStr[52] = translator("zoom_factors");
    avMLLangStr[53] = translator("connecting_to");
    avMLLangStr[54] = translator("mute");
    avMLLangStr[55] = translator("_system");
    avMLLangStr[56] = translator("system_error");
    avMLLangStr[57] = translator("can_not_open_registry");
    avMLLangStr[58] = translator("settings_saved");
    avMLLangStr[59] = translator("save_parameter_fail");
    avMLLangStr[60] = translator("disable_audio");
    avMLLangStr[61] = translator("digital_zoom_edit");
    avMLLangStr[62] = translator("play_volume");
    avMLLangStr[63] = translator("mic_volume");
    avMLLangStr[64] = translator("audio_on");
    avMLLangStr[65] = translator("mic_on");
    avMLLangStr[66] = translator("hide_panel");
    avMLLangStr[67] = translator("authenticated_failed");
    avMLLangStr[68] = translator("connect_failed");
    avMLLangStr[69] = translator("x");
    avMLLangStr[70] = translator("y");
    avMLLangStr[71] = translator("width");
    avMLLangStr[72] = translator("height");
    avMLLangStr[73] = translator("private_mask");
    avMLLangStr[74] = translator("path_does_not_exist");
    avMLLangStr[75] = translator("path_cannot_be_empty");
    avMLLangStr[76] = translator("recording_failed");
    avMLLangStr[77] = translator("recording_stop_because_disk_full_or_write_fail");    
    avMLLangStr[78] = translator("version_information");    
    avMLLangStr[79] = translator("connecting_to");
    avMLLangStr[80] = translator("start_avi_recording");
    avMLLangStr[81] = translator("stop_avi_recording");
    avMLLangStr[82] = translator("start_mp4_recording");
    avMLLangStr[83] = translator("stop_mp4_recording");
    avMLLangStr[84] = translator("mp4_recording_disabled_permission_insufficient");
    avMLLangStr[85] = translator("connect_failed");
    avMLLangStr[86] = translator("talk_disable");
    avMLLangStr[87] = translator("color");
    avMLLangStr[88] = translator("invalid_prefix_name");
    avMLLangStr[89] = translator("show_the_motion_regions_and_trajectories");
    avMLLangStr[90] = translator("hide_motion_regions_and_trajectories");
    avMLLangStr[91] = translator("joystick_settings");
    avMLLangStr[92] = translator("selected_joystick");
    avMLLangStr[93] = translator("calibrate");
    avMLLangStr[94] = translator("configure_buttons");
    avMLLangStr[95] = translator("ok");
    avMLLangStr[96] = translator("cancel");
    avMLLangStr[97] = translator("apply");
    avMLLangStr[98] = translator("buttons_configuration");
    avMLLangStr[99] = translator("assign_actions");
    avMLLangStr[100] = translator("actions");
    avMLLangStr[101] = translator("button");
    avMLLangStr[102] = translator("assigned_actions");
    avMLLangStr[103] = translator("assign");
    avMLLangStr[104] = translator("clear_selected");
    avMLLangStr[105] = translator("toogle_play_pause");
    avMLLangStr[106] = translator("stop_streaming");
    avMLLangStr[107] = translator("snapshot");
    avMLLangStr[108] = translator("fullscreen");
    avMLLangStr[109] = translator("start_stop_recording");
    avMLLangStr[110] = translator("pan");
    avMLLangStr[111] = translator("patrol");
    avMLLangStr[112] = translator("stop");
    avMLLangStr[113] = translator("digital_output_on");
    avMLLangStr[114] = translator("digital_output_off");
    avMLLangStr[115] = translator("preset");
    avMLLangStr[116] = translator("assign_button");
    avMLLangStr[117] = translator("please_select_the_button_from_the_list");
    avMLLangStr[118] = translator("this_button_is_already_assigned_to");
    avMLLangStr[119] = translator("zoom_in");
    avMLLangStr[120] = translator("zoom_out");

    obj.SetGivenLangInfo(vMLCodePage, vMLFontSize, vMLCharSet, vMLPitch, vMLSwiss, vMLFontName);
    for (i = 0; i < avMLLangStr.length; i++) 
        obj.SetLangString(i, avMLLangStr[i]);
    obj.Language = "update";
    obj.Connect();
}


function CheckEmptyString(input)
{
    if(input.value=="")
    {
				alert(translator("field_cannot_be_empty"));
        input.focus();
        input.select();
        return -1;
    }
    return 0;
}

function getCheckedValue(radioObj) {
	if(!radioObj)
		return "";
	var radioLength = radioObj.length;
	if(radioLength == undefined)
		if(radioObj.checked)
			return radioObj.value;
		else
			return "";
	for(var i = 0; i < radioLength; i++) {
		if(radioObj[i].checked) {
			return radioObj[i].value;
		}
	}
	return "";
}

function CamControl(parameterKey, parameterValue)
{	
  var cgiBin = '/cgi-bin/camctrl/camctrl.cgi';
  var fullUrl = cctvUrl ? cctvUrl + cgiBin : cgiBin;

  $.ajax({
    type: 'GET',
    url: fullUrl + '?' + parameterKey + '=' + parameterValue,
    dataType: 'jsonp',
    jsonpCallback: 'myCallBackMethod',
    async: false, // this is by default false, so not need to mention
    crossDomain: true // tell the browser to allow cross domain calls.
  }).done(function (res) {
    // Check for a successful (blank) response
  }).fail(function (req, sts, err) {
    // alert(err);
  });

    // var url = cctvUrl ? cctvUrl : '';
    // window.location.href='http://smsoft.iptime.org:38080/cgi-bin/camctrl/camctrl.cgi?'+ movetype +'=' + direction;
		// parent.retframe.location.href='/cgi-bin/camctrl/camctrl.cgi?'+ parameterKey +'=' + parameterValue;
}

function clientsidesnapshot() {
  var snapshot = '/cgi-bin/viewer/video.jpg';
  const fullUrl = cctvUrl ? cctvUrl + snapshot : snapshot;
  console.log('clientsidesnapshot', fullUrl);

  const subWindow = window.open(fullUrl, '', 'width=800, height=600, scrollbars=yes, status=yes');
  subWindow.focus();
}

function CountLength(String)
{
    var CurCharLen = 0;
    var MaxCharLen = 40;

    for (var i = 0; i < String.length; i++)
    {
        var AsciiValue = String.charCodeAt(i);
        if (AsciiValue < 128)
        {
            CurCharLen ++;
        }       
        else if (AsciiValue < 256)
        {
            CurCharLen += 2;
        }
        else
        {
            CurCharLen += 3;
        }
    }
    return CurCharLen;
}
function checkHHMMSS(input)
{
	var filter=/\d\d:\d\d:\d\d/;
	if (!filter.test(input.value)){
		alert(translator("please_enter_a_valid_complete_time"));
		input.focus();
		input.select();
		return -1;
	}
	input.value = input.value.match(filter)[0];
	sub_item = input.value.split(":");
	if (((parseInt(sub_item[0], 10) > 23) || (parseInt(sub_item[0], 10) < 00)) ||
		((parseInt(sub_item[1], 10) > 59) || (parseInt(sub_item[1], 10) < 00)) ||
		((parseInt(sub_item[2], 10) > 59) || (parseInt(sub_item[2], 10) < 00)))
	{
		alert(translator("please_enter_a_valid_complete_time"));
		input.focus();
		input.select();
		return -1;
	}
	
	return 0;
}

function checkYYYYMMDD(input)
{
	var filter=/\d\d\d\d\/\d\d\/\d\d/;
	if (!filter.test(input.value)){
		alert(translator("please_enter_a_valid_date"));
		input.focus();
		input.select();
		return -1;
	}
	input.value = input.value.match(filter)[0];
	sub_item = input.value.split("/");
	if (((parseInt(sub_item[0], 10) > 2035) || (parseInt(sub_item[0], 10) < 2000)) ||
		((parseInt(sub_item[1], 10) > 12) || (parseInt(sub_item[1], 10) < 01)) ||
		((parseInt(sub_item[2], 10) > 31) || (parseInt(sub_item[2], 10) < 01)))
	{
		alert(translator("please_enter_a_valid_date"));
		input.focus();
		input.select();
		return -1;
	}
	
	return 0;
}

function addserver()
{
	if(server_i0_name=="")
		openurl("server.html?index=0");
	else if(server_i1_name=="")
		openurl("server.html?index=1");
	else if(server_i2_name=="")
		openurl("server.html?index=2");
	else if(server_i3_name=="")
		openurl("server.html?index=3");
	else if(server_i4_name=="")
		openurl("server.html?index=4");
	else
		alert(translator("no_more_list_for_server_to_enter"));
}

function addmedia()
{
	if(media_i0_name=="")
		openurl("media.html?index=0");
	else if(media_i1_name=="")
		openurl("media.html?index=1");
	else if(media_i2_name=="")
		openurl("media.html?index=2");
	else if(media_i3_name=="")
		openurl("media.html?index=3");
	else if(media_i4_name=="")
		openurl("media.html?index=4");
	else
		alert(translator("no_more_list_for_media_to_enter"));
}

function switchBlock(block, icon)
{

	var aBlock = document.getElementById(block);
	var aIcon = document.getElementById(icon);
	
	if (aIcon.src.indexOf("/pic/rightArrow.gif") != -1)
	{
		//aBlock.style.display = "block";
		//SlideToggle(aBlock,"Auto","Slide");
		$('#'+block).slideToggle("slow");
		aIcon.src = "/pic/downArrow.gif";
	}
	else
	{
		//aBlock.style.display = "none";
		//SlideToggle(aBlock,"Auto","Slide");
		$('#'+block).slideToggle("slow");
		aIcon.src = "/pic/rightArrow.gif";
	}
}

// Use translator.xml or custom_translator.xml

/*
function changeClasses(currentdoc)
{
    var inputElements = currentdoc.getElementsByTagName('input');
    for (var i = 0; i < inputElements.length; i++) {
        if (inputElements[i].type == "submit") 
				{
            inputElements[i].className = inputElements[i].className + " submitbutton";
        }
        else if (inputElements[i].type == "checkbox") 
				{
            inputElements[i].className = inputElements[i].className + " checkbox";
        }
        else if (inputElements[i].type == "radio") 
				{
            inputElements[i].className = inputElements[i].className + " radio";
        }
        else if (inputElements[i].type == "text") 
				{
        		inputElements[i].className = inputElements[i].className + " text";
        }
        else if (inputElements[i].type == "password") 
				{
        		inputElements[i].className = inputElements[i].className + " text";
        }
				
    }
}
*/

function createCSS(selector, declaration, bOptionPage)
{
    // test for IE
    var ua = navigator.userAgent.toLowerCase();
    var isIE = (/msie/.test(ua)) && !(/opera/.test(ua)) && (/win/.test(ua));
    
    // create the style node for all browsers
    var style_node = document.createElement("style");
    style_node.setAttribute("type", "text/css");
    style_node.setAttribute("media", "screen");
    
    // append a rule for good browsers
    if (!isIE) 
        style_node.appendChild(document.createTextNode(selector + " {" + declaration + "}"));
    
    if (bOptionPage != "1") 
    {
        if (document.all) 
        {						
            // use alternative methods for IE
            if (isIE && document.styleSheets && document.styleSheets.length > 0) 
            {
                var last_style_node = document.styleSheets[document.styleSheets.length - 1];
                if (typeof(last_style_node.addRule) == "object") 
                    last_style_node.addRule(selector, declaration);
            }
        }
        else 
        {
            // append the style node
            document.getElementsByTagName("head")[0].appendChild(style_node);
        }
    }
    else 
    {
        var iframe;
        if (document.frames) 
            iframe = document.frames[0];
        else 
            iframe = window.frames[0];
        
        if (document.all) 
        {
            if (isIE && document.styleSheets && document.styleSheets.length > 0) 
            {
                var last_style_node = window.frames[0].document.styleSheets[window.frames[0].document.styleSheets.length - 1];
                if (typeof(last_style_node.addRule) == "object")
								{
									last_style_node.addRule(selector, declaration);
									//alert('in');
								}
                    
            }
        }
        else 
        {
            // append the style node
            window.frames[0].document.getElementsByTagName("head")[0].appendChild(style_node);
        }
    }
}

function updateConfPageColor()
{		
	switch(layout_theme_option)
	{
		case "1":				
				document.write("<link rel=\"stylesheet\" type=\"text/css\" href=\"/css/blue_theme_conf.css\" media=\"all\"/>");
				break;
				
		case "2":
				document.write("<link rel=\"stylesheet\" type=\"text/css\" href=\"/css/gray_theme_conf.css\" media=\"all\"/>");		
				break;

		case "3":
				document.write("<link rel=\"stylesheet\" type=\"text/css\" href=\"/css/black_theme_conf.css\" media=\"all\"/>");		
				break;
				
		case "4":
				createCSS("div#config","color: " + layout_theme_color_configbackground,'0');
				createCSS(".confGroup","background-color: " + layout_theme_color_configbackground,'0');
				createCSS(".confCase","background-color: " + layout_theme_color_case,'0');	
				createCSS(".conf_sidenav_bg","background-color: " + layout_theme_color_configbackground,'0');									
				createCSS("body","background-color: " + layout_theme_color_controlbackground,'0');
				createCSS(".confSubpageGroup","background-color: " + layout_theme_color_configbackground,'0');
				//createCSS(".confCase","border-color: " + layout_theme_color_case,'0');

				break;
		default:
				break;			
	}	
}

function updateLogoInfo()
{
	var logoElement = document.getElementById("logo");
	var wraptocenter = "<div class='wraptocenter wraptocenter_logo'><span></span>";
	var logo_src = "/pic/VIVOTEK_Logo.gif";
	
    var formalLink = layout_logo_link;
    if ((formalLink.indexOf("http://") != 0) &&
        (formalLink.indexOf("https://") != 0))
    {
        formalLink = "http://" + formalLink;
    }
    
	if (logoElement != null) 
	{		
		if (layout_logo_default == 1) 
        {
			logo_src = "/pic/VIVOTEK_Logo.gif";
        }
		else 
		{
			logo_src = "/pic/custom_logo.jpg";
		}
	}		
	logoElement.innerHTML = wraptocenter + "<a href=\"" + formalLink + "\" target=\"_blank\"><img alt=\"logo\" src=\"" + logo_src + "\" /></a></div>";
}	

function updatePowerByVVTKLogo()
{
	var logoElement = document.getElementById("sidebar-footer");
	var powerbyvvtk_logo_src = "/pic/PowerByVIVOTEK.gif";

	if (layout_logo_powerbyvvtk_hidden == 0)
	{
		logoElement.innerHTML = "<span></span><img src=\"" + powerbyvvtk_logo_src + "\" />";
	}
}
function resizeLogo()
{
		var custom_logo_img = document.getElementById("logo").getElementsByTagName("img")[0];
		var nodewith = 0,nodeheight = 0;
		
		var widthRatio = custom_logo_img.width / 160;
		var heightRatio = custom_logo_img.height / 50;
		if(widthRatio > 1 || heightRatio > 1)
		{			
			var param = (heightRatio>widthRatio)?".height='50'":".width='160'";
			eval('document.getElementById("logo").getElementsByTagName("img")[0]' + param);
		}		    
}

/* ULTRA-SIMPLE EVENT ADDING */
function addEventSimple(obj,evt,fn) {
	if (obj.addEventListener)
		obj.addEventListener(evt,fn,false);
	else if (obj.attachEvent)
		obj.attachEvent('on'+evt,fn);
}

function removeEventSimple(obj,evt,fn) {
	if (obj.removeEventListener)
		obj.removeEventListener(evt,fn,false);
	else if (obj.detachEvent)
		obj.detachEvent('on'+evt,fn);
}




var bSaved = false;
function checkOnClose(elem)
{
	if(bSaved == true)
	{
		if(opener == null) //for normal Browser, eg: Firefox
		{
			window.close();
			return -1;
		}			
		else if(typeof(opener.location.reload) == "unknown") //For stupid IE
		{
			window.close();
			return -1;			
		}
		opener.location.reload();
		window.close();
	}
	else 
	{
		if(window.closed == true) //refresh event cause onunload
		{
			window.close();
		}
		else if(typeof(elem) != "undefined" && elem.id == "btn_close")
		{
			window.close();
		}
	}
}

// 0 is basic mode, 1 is advanced mode

//auto generated F/W version by "system_info_firmwareversion"
function setFwVersion()
{
    document.write(system_info_firmwareversion.split('-')[2]);
}
